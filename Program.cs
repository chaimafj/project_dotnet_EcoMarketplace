using EcoMarketplace.API.Helpers;
using EcoMarketplace.API.Middleware;
using EcoMarketplace.API.Repositories;
using EcoMarketplace.API.Services;
using EcoMarketplace.API.Data;
using EcoMarketplace.API.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// CORS: allow Angular dev server
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Database Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Register repositories (Entity Framework)
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddScoped<IProductRepository, EfProductRepository>();

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEcoScoreService, EcoScoreService>();

// AutoMapper
builder.Services.AddAutoMapper(typeof(AutoMapperProfile));

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Ensure database exists (without wiping data)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.EnsureCreated();
    dbContext.Database.ExecuteSqlRaw(@"
        ALTER TABLE IF EXISTS ""Products""
        ADD COLUMN IF NOT EXISTS ""Currency"" integer NOT NULL DEFAULT 0;");

    dbContext.Database.ExecuteSqlRaw(@"
        ALTER TABLE IF EXISTS ""Transactions""
        ADD COLUMN IF NOT EXISTS ""ShippingFullName"" text NULL,
        ADD COLUMN IF NOT EXISTS ""ShippingEmail"" text NULL,
        ADD COLUMN IF NOT EXISTS ""ShippingPhone"" text NULL,
        ADD COLUMN IF NOT EXISTS ""ShippingAddress"" text NULL,
        ADD COLUMN IF NOT EXISTS ""ShippingCity"" text NULL,
        ADD COLUMN IF NOT EXISTS ""ShippingPostalCode"" text NULL;");

    if (app.Environment.IsDevelopment())
    {
        var adminUser = dbContext.Users.FirstOrDefault(u => u.Email == "admin@ecomarketplace.local" || u.Username == "admin");

        if (adminUser == null)
        {
            adminUser = new User
            {
                Email = "admin@ecomarketplace.local",
                Username = "admin",
                CreatedAt = DateTime.UtcNow
            };

            dbContext.Users.Add(adminUser);
        }

        adminUser.Email = "admin@ecomarketplace.local";
        adminUser.Username = "admin";
        adminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!");
        adminUser.FirstName = "Admin";
        adminUser.LastName = "EcoMarketplace";
        adminUser.ProfilePictureUrl = "https://ui-avatars.com/api/?name=Admin+EcoMarketplace";
        adminUser.Role = UserRole.Admin;
        adminUser.IsActive = true;
        adminUser.EcoScore = 0;
        adminUser.TotalPoints = 0;

        dbContext.SaveChanges();
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Global error handling
app.UseMiddleware<ErrorHandlingMiddleware>();

app.UseCors();
app.UseAuthorization();

app.MapControllers();

app.Run();
