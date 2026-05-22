namespace EcoMarketplace.API.DTOs
{
    public record CurrencyAmountDto(
        string Currency,
        decimal Amount);

    public record AdminStatsDto(
        int TotalUsers,
        int ActiveUsers,
        int TotalProducts,
        int AvailableProducts,
        int TotalTransactions,
        decimal AverageSalesPerProduct,
        decimal TotalCO2Saved,
        int AverageRecycledPercentage,
        int ProductsValidated,
        IReadOnlyList<CurrencyAmountDto> RevenueByCurrency);

    public record AdminUserDto(
        int Id,
        string FirstName,
        string LastName,
        string Username,
        string Email,
        string Role,
        DateTime CreatedAt,
        string Status,
        int EcoScore,
        int TotalPoints,
        int ProductsCount,
        int PurchasesCount,
        int SalesCount);

    public record AdminProductDto(
        int Id,
        string Title,
        string SellerName,
        int SellerId,
        decimal Price,
        string Currency,
        string Status,
        int EcoScore,
        string Material,
        string Category,
        DateTime CreatedAt,
        int SalesCount);

    public record AdminUserStatusUpdateDto(string Status);
}

