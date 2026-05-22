using Microsoft.AspNetCore.Mvc;
using EcoMarketplace.API.Services;
using EcoMarketplace.API.Helpers.DTOs;

namespace EcoMarketplace.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // Fonctionnalite: Cree une nouvelle ressource.
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            try
            {
                var result = await _authService.RegisterAsync(registerDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            try
            {
                var result = await _authService.LoginAsync(loginDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }
    }
}

