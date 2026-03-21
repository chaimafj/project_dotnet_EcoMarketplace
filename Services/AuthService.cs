using EcoMarketplace.API.Models;
using EcoMarketplace.API.Repositories;
using EcoMarketplace.API.Helpers.DTOs;
namespace EcoMarketplace.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;

        public AuthService(IUserRepository userRepository, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
        {
            // Vérifier si l'utilisateur existe déjà
            var exists = await _userRepository.ExistsAsync(registerDto.Email, registerDto.Username);
            if (exists)
                throw new Exception("User with this email or username already exists");

            var selectedRole = UserRole.Buyer;
            if (!string.IsNullOrWhiteSpace(registerDto.Role) &&
                Enum.TryParse<UserRole>(registerDto.Role, true, out var parsedRole))
            {
                // Public registration can only create Buyer or Seller accounts.
                selectedRole = parsedRole == UserRole.Seller ? UserRole.Seller : UserRole.Buyer;
            }

            var user = new User
            {
                Email = registerDto.Email,
                Username = registerDto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                ProfilePictureUrl = $"https://ui-avatars.com/api/?name={Uri.EscapeDataString($"{registerDto.FirstName} {registerDto.LastName}".Trim())}",
                Role = selectedRole,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                EcoScore = 0,
                TotalPoints = 0
            };

            var createdUser = await _userRepository.AddAsync(user);

            return new AuthResponseDto
            {
                Id = createdUser.Id,
                Email = createdUser.Email,
                Username = createdUser.Username,
                FirstName = createdUser.FirstName,
                LastName = createdUser.LastName,
                ProfilePictureUrl = createdUser.ProfilePictureUrl,
                Role = createdUser.Role.ToString(),
                EcoScore = createdUser.EcoScore,
                TotalPoints = createdUser.TotalPoints,
                Token = GenerateJwtToken(createdUser)
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            var user = await _userRepository.GetByEmailAsync(loginDto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                throw new Exception("Invalid email or password");

            if (!user.IsActive)
                throw new Exception("Account is deactivated");

            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            return new AuthResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                Username = user.Username,
                FirstName = user.FirstName,
                LastName = user.LastName,
                ProfilePictureUrl = user.ProfilePictureUrl,
                Role = user.Role.ToString(),
                EcoScore = user.EcoScore,
                TotalPoints = user.TotalPoints,
                Token = GenerateJwtToken(user)
            };
        }

        private string GenerateJwtToken(User user)
        {
            // Pour le développement, on retourne un token simple
            // Dans un environnement de production, utilisez un vrai JWT
            return $"fake-jwt-token-for-user-{user.Id}";
        }
    }
}