namespace EcoMarketplace.API.Models
{
    public enum Role
    {
        Buyer = 0,
        Seller = 1,
        Admin = 2
    }

    public enum Category
    {
        Electronics,
        Textile,
        Home,
        Other
    }

    public enum Currency
    {
        DT = 0,    // Dinar Tunisien
        EUR = 1,   // Euro
        USD = 2    // Dollar américain
    }
}
