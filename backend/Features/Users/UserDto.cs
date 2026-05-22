namespace EcoMarketplace.API.DTOs
{
    public record UserDto(
        int Id,
        string Email,
        string Username,
        string? DisplayName,
        string? FirstName,
        string? LastName,
        string? ProfilePictureUrl,
        int EcoScore);

    public record UpdateUserDto(
        string? DisplayName,
        string? FirstName,
        string? LastName,
        string? ProfilePictureUrl,
        string? Bio);
}


