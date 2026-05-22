using System;

namespace EcoMarketplace.API.Models
{
    public class EcoScore
    {
        public int Id { get; set; }
        public int Score { get; set; }
        public string? Reason { get; set; }
        public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    }
}


