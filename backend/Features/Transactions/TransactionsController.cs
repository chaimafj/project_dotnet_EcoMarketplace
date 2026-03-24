using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using EcoMarketplace.API.Repositories;
using EcoMarketplace.API.DTOs;
using EcoMarketplace.API.Data;
using EcoMarketplace.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EcoMarketplace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionsController : ControllerBase
    {
        private readonly IProductRepository _productRepository;
        private readonly ApplicationDbContext _dbContext;

        public TransactionsController(
            IProductRepository productRepository,
            ApplicationDbContext dbContext)
        {
            _productRepository = productRepository;
            _dbContext = dbContext;
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
                Status = TransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };

            await _dbContext.Transactions.AddAsync(transaction);
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

            return Ok(new { message = "Purchase processed successfully.", transaction = result });
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
