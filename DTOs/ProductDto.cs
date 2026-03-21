namespace EcoMarketplace.API.Helpers.DTOs
{
    public class EcoScoreBreakdownDto
    {
        public int MaterialScore { get; set; }
        public int CarbonScore { get; set; }
        public int ReuseScore { get; set; }
        public int FinalScore { get; set; }
        public string SustainabilityLevel { get; set; } = string.Empty;
    }

    public class ProductDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "DT";
        public string Condition { get; set; }
        public string Category { get; set; }
        public int SellerId { get; set; }
        public string SellerName { get; set; }
        public string[] Images { get; set; }
        public string Location { get; set; }
        public int EcoScore { get; set; }
        public string Material { get; set; }
        public bool IsRecycled { get; set; }
        public bool IsSustainable { get; set; }
        public double CarbonFootprint { get; set; }
        public int RecycledPercentage { get; set; }
        public EcoScoreBreakdownDto? EcoScoreDetails { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateProductDto
    {
        public int? SellerId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "DT";
        public string Condition { get; set; }
        public string Category { get; set; }
        public string[] Images { get; set; }
        public string Location { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Material { get; set; }
        public bool IsRecycled { get; set; }
        public bool IsSustainable { get; set; }
        public double CarbonFootprint { get; set; }
        public int RecycledPercentage { get; set; }
    }
}