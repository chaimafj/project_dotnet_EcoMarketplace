using EcoMarketplace.API.Helpers.DTOs;
using EcoMarketplace.API.Models;

namespace EcoMarketplace.API.Services
{
    public class EcoScoreService : IEcoScoreService
    {
        private static readonly Dictionary<string, int> MaterialScores = new(StringComparer.OrdinalIgnoreCase)
        {
            ["coton biologique"] = 90,
            ["organic cotton"] = 90,
            ["plastique recycle"] = 85,
            ["plastique recyclé"] = 85,
            ["recycled plastic"] = 85,
            ["plastique standard"] = 40,
            ["standard plastic"] = 40,
            ["non recyclable"] = 20,
            ["materiau non recyclable"] = 20,
            ["matériau non recyclable"] = 20,
            ["bamboo"] = 88,
            ["bois certifie fsc"] = 82,
            ["bois certifié fsc"] = 82
        };

        public EcoScoreBreakdownDto Calculate(Product product)
        {
            var materialScore = CalculateMaterialScore(product.Material, product.IsRecycled, product.IsSustainable);

            var carbonRaw = 100 - product.CarbonFootprint;
            var carbonScore = ClampTo100((int)Math.Round(carbonRaw, MidpointRounding.AwayFromZero));

            var reuseScore = ClampTo100(product.RecycledPercentage);
            if (product.IsRecycled)
            {
                reuseScore = ClampTo100(reuseScore + 10);
            }

            if (product.IsSustainable)
            {
                reuseScore = ClampTo100(reuseScore + 10);
            }

            // Weighted average aligned with material, carbon impact and reuse behavior.
            var finalScore = ClampTo100((int)Math.Round(
                materialScore * 0.45 + carbonScore * 0.35 + reuseScore * 0.20,
                MidpointRounding.AwayFromZero));

            return new EcoScoreBreakdownDto
            {
                MaterialScore = materialScore,
                CarbonScore = carbonScore,
                ReuseScore = reuseScore,
                FinalScore = finalScore,
                SustainabilityLevel = GetSustainabilityLevel(finalScore)
            };
        }

        private static int CalculateMaterialScore(string? material, bool isRecycled, bool isSustainable)
        {
            if (!string.IsNullOrWhiteSpace(material) && MaterialScores.TryGetValue(material.Trim(), out var score))
            {
                return score;
            }

            var fallback = 50;
            if (isRecycled) fallback += 15;
            if (isSustainable) fallback += 15;

            return ClampTo100(fallback);
        }

        private static string GetSustainabilityLevel(int finalScore)
        {
            if (finalScore >= 80) return "Excellent";
            if (finalScore >= 50) return "Modere";
            return "Faible durabilite";
        }

        private static int ClampTo100(int value) => Math.Clamp(value, 0, 100);
    }
}
