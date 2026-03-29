using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using EcoMarketplace.API.Repositories;
using EcoMarketplace.API.DTOs;
using EcoMarketplace.API.Data;
using EcoMarketplace.API.Models;
using Microsoft.EntityFrameworkCore;
using EcoMarketplace.API.Services;

namespace EcoMarketplace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionsController : ControllerBase
    {
        private readonly IProductRepository _productRepository;
        private readonly ApplicationDbContext _dbContext;
        private readonly IEcoScoreService _ecoScoreService;

        public TransactionsController(
            IProductRepository productRepository,
            ApplicationDbContext dbContext,
            IEcoScoreService ecoScoreService)
        {
            _productRepository = productRepository;
            _dbContext = dbContext;
            _ecoScoreService = ecoScoreService;
        }

        [HttpPost("purchase")]
        public async Task<IActionResult> Purchase([FromBody] PurchaseDto dto)
        {
            if (dto.Quantity <= 0)
                return BadRequest(new { message = "Quantity must be greater than zero" });

            if (string.IsNullOrWhiteSpace(dto.FullName) ||
                string.IsNullOrWhiteSpace(dto.Phone) ||
                string.IsNullOrWhiteSpace(dto.Address) ||
                string.IsNullOrWhiteSpace(dto.City) ||
                string.IsNullOrWhiteSpace(dto.PostalCode))
            {
                return BadRequest(new { message = "Missing shipping information" });
            }

            var buyer = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == dto.BuyerId && u.IsActive);
            if (buyer == null)
                return NotFound(new { message = "Buyer not found" });

            var product = await _productRepository.GetByIdAsync(dto.ProductId);
            if (product == null) return NotFound(new { message = "Product not found" });

            if (product.Status != ProductStatus.Available)
                return BadRequest(new { message = "Product is no longer available" });

            if (product.SellerId == dto.BuyerId)
                return BadRequest(new { message = "You cannot purchase your own product" });

            var total = product.Price * dto.Quantity;

            var transaction = new Transaction
            {
                BuyerId = dto.BuyerId,
                SellerId = product.SellerId,
                ProductId = product.Id,
                Amount = total,
                TransactionType = TransactionType.Purchase,
                PaymentIntentId = dto.PaymentMethod ?? "manual",
                ShippingFullName = dto.FullName?.Trim(),
                ShippingEmail = dto.Email?.Trim(),
                ShippingPhone = dto.Phone?.Trim(),
                ShippingAddress = dto.Address?.Trim(),
                ShippingCity = dto.City?.Trim(),
                ShippingPostalCode = dto.PostalCode?.Trim(),
                Status = TransactionStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                CompletedAt = null
            };

            await _dbContext.Transactions.AddAsync(transaction);

            // Calculate eco score and award eco points to buyer
            var ecoScoreBreakdown = _ecoScoreService.Calculate(product);
            var ecoPointsAwarded = (ecoScoreBreakdown.FinalScore / 10) * dto.Quantity; // Award points based on score and quantity
            buyer.TotalPoints += ecoPointsAwarded;

            // Recalculate buyer's overall eco score as average of all purchased products
            var buyerTransactions = await _dbContext.Transactions
                .Where(t => t.BuyerId == dto.BuyerId && t.TransactionType == TransactionType.Purchase)
                .Include(t => t.Product)
                .ToListAsync();

            if (buyerTransactions.Any())
            {
                var totalEcoScore = 0;
                foreach (var trans in buyerTransactions)
                {
                    var score = _ecoScoreService.Calculate(trans.Product);
                    totalEcoScore += score.FinalScore;
                }
                buyer.EcoScore = (int)Math.Round((double)totalEcoScore / buyerTransactions.Count);
            }

            await _dbContext.SaveChangesAsync();

            var result = new PurchaseResultDto(
                transaction.Id,
                transaction.BuyerId,
                transaction.ProductId,
                product.Title,
                dto.Quantity,
                total,
                transaction.Status.ToString(),
                transaction.CreatedAt);

            return Ok(new { message = "Purchase created and awaiting seller confirmation.", transaction = result });
        }

        [HttpPost("seller/{sellerId:int}/sales/{transactionId:int}/confirm")]
        public async Task<IActionResult> ConfirmSale(int sellerId, int transactionId)
        {
            var transaction = await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.TransactionType == TransactionType.Purchase);

            if (transaction == null)
                return NotFound(new { message = "Sale not found" });

            if (transaction.SellerId != sellerId)
                return BadRequest(new { message = "This sale does not belong to the seller" });

            if (transaction.Status == TransactionStatus.Completed)
            {
                return Ok(new ConfirmSaleResultDto(
                    "Sale already confirmed.",
                    transaction.Status.ToString().ToLower(),
                    transaction.CompletedAt));
            }

            if (transaction.Status != TransactionStatus.Pending)
                return BadRequest(new { message = "Only pending sales can be confirmed" });

            transaction.Status = TransactionStatus.Completed;
            transaction.CompletedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return Ok(new ConfirmSaleResultDto(
                "Sale confirmed successfully.",
                transaction.Status.ToString().ToLower(),
                transaction.CompletedAt));
        }

        [HttpPut("seller/{sellerId:int}/sales/{transactionId:int}/status")]
        public async Task<IActionResult> UpdateSaleStatus(int sellerId, int transactionId, [FromBody] UpdateSaleStatusDto dto)
        {
            var transaction = await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.Id == transactionId && t.TransactionType == TransactionType.Purchase);

            if (transaction == null)
                return NotFound(new { message = "Sale not found" });

            if (transaction.SellerId != sellerId)
                return BadRequest(new { message = "This sale does not belong to the seller" });

            if (string.IsNullOrWhiteSpace(dto.Status))
                return BadRequest(new { message = "Status is required" });

            if (!Enum.TryParse<TransactionStatus>(dto.Status, true, out var newStatus))
                return BadRequest(new { message = "Invalid status. Allowed: pending, completed, failed, refunded" });

            transaction.Status = newStatus;
            transaction.CompletedAt = newStatus == TransactionStatus.Completed ? DateTime.UtcNow : null;

            await _dbContext.SaveChangesAsync();

            return Ok(new ConfirmSaleResultDto(
                "Sale status updated successfully.",
                transaction.Status.ToString().ToLower(),
                transaction.CompletedAt));
        }

        [HttpGet("user/{userId:int}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            var transactions = await _dbContext.Transactions
                .AsNoTracking()
                .Include(t => t.Product)
                .Where(t => t.BuyerId == userId && t.TransactionType == TransactionType.Purchase)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new UserOrderDto(
                    t.Id,
                    t.ProductId,
                    t.Product.Title,
                    1,
                    t.Amount,
                    t.Product.Currency.ToString(),
                    t.Status.ToString().ToLower(),
                    t.CreatedAt))
                .ToListAsync();

            return Ok(transactions);
        }

        [HttpGet("seller/{sellerId:int}")]
        public async Task<IActionResult> GetBySeller(int sellerId)
        {
            var sales = await _dbContext.Transactions
                .AsNoTracking()
                .Include(t => t.Product)
                .Include(t => t.Buyer)
                .Where(t => t.SellerId == sellerId && t.TransactionType == TransactionType.Purchase)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new SellerSaleDto(
                    t.Id,
                    t.ProductId,
                    t.Product.Title,
                    t.BuyerId,
                    (t.Buyer.FirstName + " " + t.Buyer.LastName).Trim(),
                    1,
                    t.Amount,
                    t.Product.Currency.ToString(),
                    t.Status.ToString().ToLower(),
                    t.CreatedAt))
                .ToListAsync();

            return Ok(sales);
        }
    }
}
