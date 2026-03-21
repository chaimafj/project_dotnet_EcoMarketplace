using System;
using EcoMarketplace.API.Models;

namespace EcoMarketplace.API.Helpers
{
    public static class JwtHelper
    {
        public static string GenerateToken(User user)
        {
            // Placeholder - generate JWT in real implementation
            return $"token-for-user-{user.Id}";
        }
    }
}
