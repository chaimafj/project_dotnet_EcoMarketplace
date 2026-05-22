using Microsoft.EntityFrameworkCore;
using EcoMarketplace.API.Models;

namespace EcoMarketplace.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<Badge> Badges { get; set; }
        public DbSet<UserBadge> UserBadges { get; set; }

        // Fonctionnalite: Gere un evenement de l'application.
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuration des indexes
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            // Configuration de UserBadge (clÃƒÂ© composite)
            modelBuilder.Entity<UserBadge>()
                .HasKey(ub => new { ub.UserId, ub.BadgeId });

            // Relations
            modelBuilder.Entity<Product>()
                .HasOne(p => p.Seller)
                .WithMany(u => u.Products)
                .HasForeignKey(p => p.SellerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.Buyer)
                .WithMany(u => u.Purchases)
                .HasForeignKey(t => t.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.Seller)
                .WithMany(u => u.Sales)
                .HasForeignKey(t => t.SellerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.Product)
                .WithMany(p => p.Transactions)
                .HasForeignKey(t => t.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            // Seed data pour les badges
            modelBuilder.Entity<Badge>().HasData(
                new Badge { Id = 1, Name = "Eco Beginner", Description = "Premiers pas ÃƒÂ©co-responsables", IconUrl = "/assets/badges/beginner.png", PointsRequired = 10, Type = BadgeType.Buyer },
                new Badge { Id = 2, Name = "Green Shopper", Description = "10 achats ÃƒÂ©co-responsables", IconUrl = "/assets/badges/shopper.png", PointsRequired = 50, Type = BadgeType.Buyer },
                new Badge { Id = 3, Name = "Eco Seller", Description = "10 ventes durables", IconUrl = "/assets/badges/seller.png", PointsRequired = 50, Type = BadgeType.Seller },
                new Badge { Id = 4, Name = "Recycling Hero", Description = "20 articles recyclÃƒÂ©s", IconUrl = "/assets/badges/recycler.png", PointsRequired = 100, Type = BadgeType.Recycler },
                new Badge { Id = 5, Name = "Eco Warrior", Description = "500 points ÃƒÂ©co", IconUrl = "/assets/badges/warrior.png", PointsRequired = 500, Type = BadgeType.EcoWarrior }
            );
        }
    }
}

