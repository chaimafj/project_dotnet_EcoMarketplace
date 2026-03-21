using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using EcoMarketplace.API.Models;
using EcoMarketplace.API.Repositories;
using EcoMarketplace.API.Helpers.DTOs;
using EcoMarketplace.API.Services;

namespace EcoMarketplace.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _productRepository;
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;
        private readonly IEcoScoreService _ecoScoreService;

        public ProductsController(
            IProductRepository productRepository,
            IUserRepository userRepository,
            IMapper mapper,
            IEcoScoreService ecoScoreService)
        {
            _productRepository = productRepository;
            _userRepository = userRepository;
            _mapper = mapper;
            _ecoScoreService = ecoScoreService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null,
            [FromQuery] int? minEcoScore = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] int? sellerId = null)
        {
            ProductCategory? parsedCategory = null;
            if (!string.IsNullOrWhiteSpace(category))
            {
                if (!Enum.TryParse<ProductCategory>(category, true, out var categoryEnum))
                {
                    return BadRequest(new { message = "Invalid category" });
                }

                parsedCategory = categoryEnum;
            }

            IEnumerable<Product> products;
            int totalCount;

            // Si sellerId est fourni, récupérer les produits de ce vendeur
            if (sellerId.HasValue)
            {
                var sellerProducts = await _productRepository.GetBySellerIdAsync(sellerId.Value);
                
                // Appliquer les filtres supplémentaires
                var query = sellerProducts.AsQueryable();
                
                if (!string.IsNullOrWhiteSpace(search))
                {
                    query = query.Where(p => p.Title.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                                           p.Description.Contains(search, StringComparison.OrdinalIgnoreCase));
                }
                
                if (parsedCategory.HasValue)
                {
                    query = query.Where(p => p.Category == parsedCategory);
                }
                
                if (minEcoScore.HasValue)
                {
                    query = query.Where(p => p.EcoScore >= minEcoScore);
                }
                
                if (maxPrice.HasValue)
                {
                    query = query.Where(p => p.Price <= maxPrice);
                }

                totalCount = query.Count();
                products = query
                    .OrderByDescending(p => p.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();
            }
            else
            {
                products = await _productRepository.GetAllAsync(
                    page,
                    pageSize,
                    search,
                    parsedCategory,
                    minEcoScore,
                    maxPrice);

                totalCount = await _productRepository.GetTotalCountAsync(
                    search,
                    parsedCategory,
                    minEcoScore,
                    maxPrice);
            }

            var productDtos = products.Select(ToProductDto).ToList();

            return Ok(new
            {
                items = productDtos,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProduct(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);

            if (product == null)
                return NotFound(new { message = "Product not found" });

            var productDto = ToProductDto(product);
            return Ok(productDto);
        }

        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto createProductDto)
        {
            try
            {
                // Pour le développement, on accepte un sellerId depuis le frontend.
                // Dans un environnement réel, récupérez l'ID depuis le token JWT.
                int sellerId = createProductDto.SellerId ?? 1;

                var seller = await _userRepository.GetByIdAsync(sellerId);
                if (seller == null)
                {
                    // Réutiliser un vendeur de test existant pour éviter les doublons
                    seller = await _userRepository.GetByUsernameAsync("testseller");

                    if (seller == null)
                    {
                        // Créer un vendeur de test si nécessaire
                        seller = new User
                        {
                            Email = "seller.test@ecomarketplace.local",
                            Username = "testseller",
                            PasswordHash = "test",
                            FirstName = "Test",
                            LastName = "Seller",
                            ProfilePictureUrl = "https://ui-avatars.com/api/?name=Test+Seller",
                            Role = UserRole.Seller,
                            IsActive = true
                        };

                        seller = await _userRepository.AddAsync(seller);
                    }

                    sellerId = seller.Id;
                }

                var product = _mapper.Map<Product>(createProductDto);
                product.SellerId = sellerId;

                if (!Enum.TryParse(createProductDto.Condition, true, out ProductCondition condition))
                {
                    return BadRequest(new { message = "Invalid product condition" });
                }

                if (!Enum.TryParse(createProductDto.Category, true, out ProductCategory category))
                {
                    return BadRequest(new { message = "Invalid product category" });
                }

                if (!Enum.TryParse(createProductDto.Currency, true, out Currency currency))
                {
                    return BadRequest(new { message = "Invalid currency. Allowed values: DT, EUR, USD" });
                }

                product.Condition = condition;
                product.Category = category;
                product.Currency = currency;
                product.CarbonFootprint = createProductDto.CarbonFootprint;

                var ecoBreakdown = _ecoScoreService.Calculate(product);
                product.EcoScore = ecoBreakdown.FinalScore;

                var createdProduct = await _productRepository.AddAsync(product);
                var productDto = ToProductDto(createdProduct);

                return CreatedAtAction(nameof(GetProduct), new { id = createdProduct.Id }, productDto);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q))
                return Ok(new List<ProductDto>());

            var products = await _productRepository.SearchAsync(q);
            var productDtos = products.Select(ToProductDto).ToList();

            return Ok(productDtos);
        }

        [HttpGet("category/{category}")]
        public async Task<IActionResult> GetByCategory(string category)
        {
            if (Enum.TryParse<ProductCategory>(category, true, out var categoryEnum))
            {
                var products = await _productRepository.GetByCategoryAsync(categoryEnum);
                var productDtos = products.Select(ToProductDto).ToList();
                return Ok(productDtos);
            }

            return BadRequest(new { message = "Invalid category" });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] CreateProductDto updateProductDto)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
            {
                return NotFound(new { message = "Product not found" });
            }

            if (!Enum.TryParse(updateProductDto.Condition, true, out ProductCondition condition))
            {
                return BadRequest(new { message = "Invalid product condition" });
            }

            if (!Enum.TryParse(updateProductDto.Category, true, out ProductCategory category))
            {
                return BadRequest(new { message = "Invalid product category" });
            }

            product.Title = updateProductDto.Title;
            product.Description = updateProductDto.Description;
            product.Price = updateProductDto.Price;
            product.Condition = condition;
            product.Category = category;
            product.Images = updateProductDto.Images;
            product.Location = updateProductDto.Location;
            product.Latitude = updateProductDto.Latitude;
            product.Longitude = updateProductDto.Longitude;
            product.Material = updateProductDto.Material;
            product.IsRecycled = updateProductDto.IsRecycled;
            product.IsSustainable = updateProductDto.IsSustainable;
            product.CarbonFootprint = updateProductDto.CarbonFootprint;
            product.RecycledPercentage = updateProductDto.RecycledPercentage;

            var ecoBreakdown = _ecoScoreService.Calculate(product);
            product.EcoScore = ecoBreakdown.FinalScore;

            await _productRepository.UpdateAsync(product);

            return Ok(ToProductDto(product));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
            {
                return NotFound(new { message = "Product not found" });
            }

            await _productRepository.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("{id}/eco-score")]
        public async Task<IActionResult> GetProductEcoScore(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
            {
                return NotFound(new { message = "Product not found" });
            }

            var ecoBreakdown = _ecoScoreService.Calculate(product);
            return Ok(ecoBreakdown);
        }

        private ProductDto ToProductDto(Product product)
        {
            var dto = _mapper.Map<ProductDto>(product);
            dto.EcoScoreDetails = _ecoScoreService.Calculate(product);
            dto.EcoScore = dto.EcoScoreDetails.FinalScore;
            return dto;
        }
    }
}