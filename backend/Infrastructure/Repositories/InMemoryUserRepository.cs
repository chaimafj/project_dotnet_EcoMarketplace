using System.Collections.Concurrent;
using EcoMarketplace.API.Models;

namespace EcoMarketplace.API.Repositories
{
    public class InMemoryUserRepository : IUserRepository
    {
        private readonly ConcurrentDictionary<int, User> _users = new();
        private int _nextId = 1;

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        public InMemoryUserRepository()
        {
            // Ajouter un utilisateur de test
            var testUser = new User
            {
                Id = _nextId++,
                Email = "test@test.com",
                Username = "testuser",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                FirstName = "Test",
                LastName = "User",
                Role = UserRole.Buyer,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                EcoScore = 0,
                TotalPoints = 0
            };
            _users[testUser.Id] = testUser;

            // Ajouter un vendeur de test
            var testSeller = new User
            {
                Id = _nextId++,
                Email = "seller@test.com",
                Username = "testseller",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                FirstName = "Test",
                LastName = "Seller",
                Role = UserRole.Seller,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                EcoScore = 0,
                TotalPoints = 0
            };
            _users[testSeller.Id] = testSeller;
        }

        // Fonctionnalite: Recupere les donnees demandees.
        public async Task<User?> GetByIdAsync(int id)
        {
            _users.TryGetValue(id, out var user);
            return await Task.FromResult(user);
        }

        // Fonctionnalite: Recupere les donnees demandees.
        public async Task<User?> GetByEmailAsync(string email)
        {
            var user = _users.Values.FirstOrDefault(u => u.Email == email);
            return await Task.FromResult(user);
        }

        // Fonctionnalite: Recupere les donnees demandees.
        public async Task<User?> GetByUsernameAsync(string username)
        {
            var user = _users.Values.FirstOrDefault(u => u.Username == username);
            return await Task.FromResult(user);
        }

        // Fonctionnalite: Recupere les donnees demandees.
        public async Task<IEnumerable<User>> GetAllAsync()
        {
            return await Task.FromResult(_users.Values.ToList());
        }

        // Fonctionnalite: Cree une nouvelle ressource.
        public async Task<User> AddAsync(User user)
        {
            user.Id = _nextId++;
            user.CreatedAt = DateTime.UtcNow;
            user.IsActive = true;

            _users[user.Id] = user;
            return await Task.FromResult(user);
        }

        // Fonctionnalite: Met a jour les donnees existantes.
        public async Task UpdateAsync(User user)
        {
            if (_users.ContainsKey(user.Id))
            {
                _users[user.Id] = user;
            }
            await Task.CompletedTask;
        }

        // Fonctionnalite: Supprime la ressource ciblee.
        public async Task DeleteAsync(int id)
        {
            if (_users.TryGetValue(id, out var user))
            {
                user.IsActive = false;
                _users[id] = user;
            }
            await Task.CompletedTask;
        }

        // Fonctionnalite: Verifie une condition metier.
        public async Task<bool> ExistsAsync(string email, string username)
        {
            var exists = _users.Values.Any(u => u.Email == email || u.Username == username);
            return await Task.FromResult(exists);
        }
    }
}

