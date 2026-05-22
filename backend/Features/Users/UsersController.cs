using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using EcoMarketplace.API.Repositories;
using AutoMapper;
using EcoMarketplace.API.DTOs;

namespace EcoMarketplace.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        public UsersController(IUserRepository userRepository, IMapper mapper)
        {
            _userRepository = userRepository;
            _mapper = mapper;
        }

        // Fonctionnalite: Recupere les donnees demandees.
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(ToUserDto(user));
        }

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            // Placeholder: return first user if any
            var users = await _userRepository.GetAllAsync();
            var first = System.Linq.Enumerable.FirstOrDefault(users);
            if (first == null) return NotFound();
            return Ok(ToUserDto(first));
        }

        // Fonctionnalite: Met a jour les donnees existantes.
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.FirstName))
            {
                user.FirstName = dto.FirstName.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.LastName))
            {
                user.LastName = dto.LastName.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.ProfilePictureUrl))
            {
                user.ProfilePictureUrl = dto.ProfilePictureUrl.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.DisplayName))
            {
                var parts = dto.DisplayName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length > 0)
                {
                    user.FirstName = parts[0];
                    user.LastName = parts.Length > 1 ? string.Join(' ', parts.Skip(1)) : user.LastName;
                }
            }

            await _userRepository.UpdateAsync(user);
            return NoContent();
        }

        // Fonctionnalite: Transforme les donnees vers le format cible.
        private static UserDto ToUserDto(Models.User user)
        {
            var displayName = string.Join(' ', new[] { user.FirstName, user.LastName }
                .Where(x => !string.IsNullOrWhiteSpace(x)));

            return new UserDto(
                user.Id,
                user.Email,
                user.Username,
                string.IsNullOrWhiteSpace(displayName) ? null : displayName,
                user.FirstName,
                user.LastName,
                user.ProfilePictureUrl,
                user.EcoScore);
        }
    }
}


