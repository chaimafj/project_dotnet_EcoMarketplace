using Microsoft.EntityFrameworkCore;
using EcoMarketplace.API.Models;
using EcoMarketplace.API.Data;

namespace EcoMarketplace.API.Repositories
{
    public class EfUserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        public EfUserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // Fonctionnalite: Recupere les donnees demandees.
        public async Task<User> GetByIdAsync(int id)
        {
            return await _context.Users
                .Include(u => u.Products)
                .Include(u => u.UserBadges)
                .ThenInclude(ub => ub.Badge)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        // Fonctionnalite: Recupere les donnees demandees.
        public async Task<User> GetByEmailAsync(string email)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        // Fonctionnalite: Recupere les donnees demandees.
        public async Task<User> GetByUsernameAsync(string username)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Username == username);
        }

        // Fonctionnalite: Recupere les donnees demandees.
        public async Task<IEnumerable<User>> GetAllAsync()
        {
            return await _context.Users
                .Include(u => u.Products)
                .ToListAsync();
        }

        // Fonctionnalite: Cree une nouvelle ressource.
        public async Task<User> AddAsync(User user)
        {
            user.CreatedAt = DateTime.UtcNow;
            user.IsActive = true;

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            return user;
        }

        // Fonctionnalite: Met a jour les donnees existantes.
        public async Task UpdateAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        // Fonctionnalite: Supprime la ressource ciblee.
        public async Task DeleteAsync(int id)
        {
            var user = await GetByIdAsync(id);
            if (user != null)
            {
                user.IsActive = false;
                await UpdateAsync(user);
            }
        }

        // Fonctionnalite: Verifie une condition metier.
        public async Task<bool> ExistsAsync(string email, string username)
        {
            return await _context.Users
                .AnyAsync(u => u.Email == email || u.Username == username);
        }
    }
}

