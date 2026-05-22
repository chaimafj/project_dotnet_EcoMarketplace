using EcoMarketplace.API.Models;

namespace EcoMarketplace.API.Repositories
{
    public interface IProductRepository
    {
        Task<Product?> GetByIdAsync(int id);
        Task<IEnumerable<Product>> GetAllAsync(
            int page,
            int pageSize,
            string? search = null,
            ProductCategory? category = null,
            int? minEcoScore = null,
            decimal? maxPrice = null);
        Task<IEnumerable<Product>> GetBySellerIdAsync(int sellerId);
        Task<IEnumerable<Product>> GetByCategoryAsync(ProductCategory category);
        Task<IEnumerable<Product>> SearchAsync(string searchTerm);
        Task<Product> AddAsync(Product product);
        Task UpdateAsync(Product product);
        Task DeleteAsync(int id);
        Task<int> GetTotalCountAsync(
            string? search = null,
            ProductCategory? category = null,
            int? minEcoScore = null,
            decimal? maxPrice = null);
    }
}

