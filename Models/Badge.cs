namespace EcoMarketplace.API.Models
{
    public class Badge
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconUrl { get; set; }
        public int PointsRequired { get; set; }
        public BadgeType Type { get; set; }

        public ICollection<UserBadge> UserBadges { get; set; }
    }

    public class UserBadge
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int BadgeId { get; set; }
        public Badge Badge { get; set; }

        public DateTime EarnedAt { get; set; }
    }

    public enum BadgeType
    {
        Buyer,
        Seller,
        Recycler,
        EcoWarrior
    }
}