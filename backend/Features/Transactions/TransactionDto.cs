namespace EcoMarketplace.API.DTOs
{
    public record TransactionDto(int Id, int BuyerId, int ProductId, int Quantity, decimal TotalPrice);
    public record PurchaseDto(
        int BuyerId,
        int ProductId,
        int Quantity = 1,
        string? PaymentMethod = null,
        string? FullName = null,
        string? Email = null,
        string? Phone = null,
        string? Address = null,
        string? City = null,
        string? PostalCode = null);

    public record PurchaseResultDto(
        int Id,
        int BuyerId,
        int ProductId,
        string ProductName,
        int Quantity,
        decimal Total,
        string Status,
        DateTime PurchasedAt);

    public record UserOrderDto(
        int Id,
        int ProductId,
        string ProductName,
        int Quantity,
        decimal TotalPrice,
        string Currency,
        string Status,
        DateTime PurchasedAt);

    public record SellerSaleDto(
        int Id,
        int ProductId,
        string ProductName,
        int BuyerId,
        string BuyerName,
        int Quantity,
        decimal TotalPrice,
        string Currency,
        string Status,
        DateTime PurchasedAt);

    public record ConfirmSaleResultDto(
        string Message,
        string Status,
        DateTime? ConfirmedAt);

    public record UpdateSaleStatusDto(string Status);
}


