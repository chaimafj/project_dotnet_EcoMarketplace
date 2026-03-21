using System.ComponentModel.DataAnnotations;

namespace EcoMarketplace.API.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Username { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string ProfilePictureUrl { get; set; }
        public UserRole Role { get; set; }
        public int EcoScore { get; set; }
        public int TotalPoints { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public bool IsActive { get; set; }

        // Navigation properties
        public ICollection<Product> Products { get; set; }
        public ICollection<Transaction> Purchases { get; set; }
        public ICollection<Transaction> Sales { get; set; }
        public ICollection<UserBadge> UserBadges { get; set; }
    }

    public enum UserRole
    {
        Buyer,
        Seller,
        Admin
    }
}