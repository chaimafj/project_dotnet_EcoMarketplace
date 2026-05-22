using System.ComponentModel.DataAnnotations;

namespace EcoMarketplace.API.Models
{
    public class Product
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        public Currency Currency { get; set; } = Currency.DT;

        public ProductCondition Condition { get; set; }
        public ProductCategory Category { get; set; }

        [Required]
        public int SellerId { get; set; }

        public User Seller { get; set; }

        public string[] Images { get; set; }
        public string Location { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }

        // Eco properties
        public int EcoScore { get; set; }
        public string Material { get; set; }
        public bool IsRecycled { get; set; }
        public bool IsSustainable { get; set; }
        public double CarbonFootprint { get; set; }
        public int RecycledPercentage { get; set; }

        public ProductStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int ViewCount { get; set; }

        // Navigation properties
        public ICollection<Transaction> Transactions { get; set; }
    }

    public enum ProductCondition
    {
        New,
        LikeNew,
        Good,
        Fair,
        ForRecycling
    }

    public enum ProductCategory
    {
        Electronics,
        Textile,
        Furniture,
        Books,
        Sports,
        Other
    }

    public enum ProductStatus
    {
        Available,
        Pending,
        Sold,
        Removed
    }
}

