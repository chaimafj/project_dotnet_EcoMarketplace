using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using EcoMarketplace.API.Repositories;
using EcoMarketplace.API.Data;
using EcoMarketplace.API.DTOs;
using EcoMarketplace.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EcoMarketplace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IProductRepository _productRepository;
        private readonly ApplicationDbContext _dbContext;

        public AdminController(
            IUserRepository userRepository,
            IProductRepository productRepository,
            ApplicationDbContext dbContext)
        {
            _userRepository = userRepository;
            _productRepository = productRepository;
            _dbContext = dbContext;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _dbContext.Users
                .AsNoTracking()
                .Include(u => u.Products)
                .Include(u => u.Purchases)
                .Include(u => u.Sales)
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new AdminUserDto(
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    u.Username,
                    u.Email,
                    u.Role.ToString(),
                    u.CreatedAt,
                    u.IsActive ? "active" : "inactive",
                    u.EcoScore,
                    u.TotalPoints,
                    u.Products.Count,
                    u.Purchases.Count,
                    u.Sales.Count))
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("users/{id:int}/status")]
        public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] AdminUserStatusUpdateDto dto)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();

            var requestedStatus = (dto.Status ?? string.Empty).Trim().ToLowerInvariant();
            user.IsActive = requestedStatus == "active";

            await _userRepository.UpdateAsync(user);
            return Ok(new { message = "User status updated.", id, status = user.IsActive ? "active" : "inactive" });
        }

        [HttpDelete("users/{id:int}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();

            await _userRepository.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _dbContext.Products
                .AsNoTracking()
                .Include(p => p.Seller)
                .Include(p => p.Transactions)
                .Where(p => p.Status != ProductStatus.Removed)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new AdminProductDto(
                    p.Id,
                    p.Title,
                    string.Join(' ', new[] { p.Seller.FirstName, p.Seller.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim().Length > 0
                        ? string.Join(' ', new[] { p.Seller.FirstName, p.Seller.LastName }.Where(x => !string.IsNullOrWhiteSpace(x)))
                        : p.Seller.Username,
                    p.SellerId,
                    p.Price,
                    p.Currency.ToString(),
                    p.Status.ToString(),
                    p.EcoScore,
                    p.Material,
                    p.Category.ToString(),
                    p.CreatedAt,
                    p.Transactions.Count(t => t.TransactionType == TransactionType.Purchase)))
                .ToListAsync();

            return Ok(products);
        }

        [HttpPost("validate-product/{id:int}")]
        public async Task<IActionResult> ValidateProduct(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null) return NotFound();
            product.Status = Models.ProductStatus.Available;
            await _productRepository.UpdateAsync(product);
            return Ok(new { message = "Product validated.", id });
        }

        [HttpDelete("products/{id:int}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _dbContext.Products
                .Include(p => p.Transactions)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return NotFound();

            if (product.Transactions.Any())
            {
                _dbContext.Transactions.RemoveRange(product.Transactions);
            }

            _dbContext.Products.Remove(product);
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("stats")]
        public async Task<IActionResult> Stats()
        {
            var totalUsers = await _dbContext.Users.CountAsync();
            var activeUsers = await _dbContext.Users.CountAsync(u => u.IsActive);
            var allProducts = await _dbContext.Products.Where(p => p.Status != ProductStatus.Removed).ToListAsync();
            var totalProducts = allProducts.Count;
            var availableProducts = allProducts.Count(p => p.Status == ProductStatus.Available);
            var totalTransactions = await _dbContext.Transactions.CountAsync(t => t.TransactionType == TransactionType.Purchase);

            var revenueByCurrency = await _dbContext.Transactions
                .AsNoTracking()
                .Include(t => t.Product)
                .Where(t => t.TransactionType == TransactionType.Purchase)
                .GroupBy(t => t.Product.Currency)
                .Select(g => new CurrencyAmountDto(g.Key.ToString(), g.Sum(t => t.Amount)))
                .ToListAsync();

            var averageSalesPerProduct = totalProducts > 0
                ? Math.Round((decimal)totalTransactions / totalProducts, 2)
                : 0;

            var averageRecycledPercentage = totalProducts > 0
                ? (int)Math.Round(allProducts.Average(p => p.RecycledPercentage))
                : 0;

            var stats = new AdminStatsDto(
                totalUsers,
                activeUsers,
                totalProducts,
                availableProducts,
                totalTransactions,
                averageSalesPerProduct,
                allProducts.Sum(p => (decimal)p.CarbonFootprint),
                averageRecycledPercentage,
                availableProducts,
                revenueByCurrency);

            return Ok(stats);
        }
    }
}
