using EcoMarketplace.API.Models;

namespace EcoMarketplace.API.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(int id);  // Ajout du ?
        Task<User?> GetByEmailAsync(string email);  // Ajout du ?
        Task<User?> GetByUsernameAsync(string username);  // Ajout du ?
        Task<IEnumerable<User>> GetAllAsync();
        Task<User> AddAsync(User user);  // Retourne Task<User> (non nullable car on crée l'utilisateur)
        Task UpdateAsync(User user);
        Task DeleteAsync(int id);
        Task<bool> ExistsAsync(string email, string username);
    }
}