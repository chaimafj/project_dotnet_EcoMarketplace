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

            // Si sellerId est fourni, rÃƒÂ©cupÃƒÂ©rer les produits de ce vendeur
            if (sellerId.HasValue)
            {
                var sellerProducts = await _productRepository.GetBySellerIdAsync(sellerId.Value);
                
                // Appliquer les filtres supplÃƒÂ©mentaires
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

        // Fonctionnalite: Recupere les donnees demandees.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProduct(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);

            if (product == null)
                return NotFound(new { message = "Product not found" });

            var productDto = ToProductDto(product);
            return Ok(productDto);
        }

        // Fonctionnalite: Cree une nouvelle ressource.
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto createProductDto)
        {
            try
            {
                // Pour le dÃƒÂ©veloppement, on accepte un sellerId depuis le frontend.
                // Dans un environnement rÃƒÂ©el, rÃƒÂ©cupÃƒÂ©rez l'ID depuis le token JWT.
                int sellerId = createProductDto.SellerId ?? 1;

                var seller = await _userRepository.GetByIdAsync(sellerId);
                if (seller == null)
                {
                    // RÃƒÂ©utiliser un vendeur de test existant pour ÃƒÂ©viter les doublons
                    seller = await _userRepository.GetByUsernameAsync("testseller");

                    if (seller == null)
                    {
                        // CrÃƒÂ©er un vendeur de test si nÃƒÂ©cessaire
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
                ApplyAutomaticEcoInputs(product, createProductDto);

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

        // Fonctionnalite: Recherche les elements correspondant aux criteres.
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q))
                return Ok(new List<ProductDto>());

            var products = await _productRepository.SearchAsync(q);
            var productDtos = products.Select(ToProductDto).ToList();

            return Ok(productDtos);
        }

        // Fonctionnalite: Recupere les donnees demandees.
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

        // Fonctionnalite: Met a jour les donnees existantes.
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
            ApplyAutomaticEcoInputs(product, updateProductDto);

            var ecoBreakdown = _ecoScoreService.Calculate(product);
            product.EcoScore = ecoBreakdown.FinalScore;

            await _productRepository.UpdateAsync(product);

            return Ok(ToProductDto(product));
        }

        // Fonctionnalite: Supprime la ressource ciblee.
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

        // Fonctionnalite: Recupere les donnees demandees.
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

        // Fonctionnalite: Transforme les donnees vers le format cible.
        private ProductDto ToProductDto(Product product)
        {
            var dto = _mapper.Map<ProductDto>(product);
            dto.EcoScoreDetails = _ecoScoreService.Calculate(product);
            dto.EcoScore = dto.EcoScoreDetails.FinalScore;
            return dto;
        }

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        private static void ApplyAutomaticEcoInputs(Product product, CreateProductDto dto)
        {
            var normalizedMaterial = (product.Material ?? string.Empty).Trim().ToLowerInvariant();

            var inferredRecycled = InferRecycledFromMaterial(normalizedMaterial);
            var inferredSustainable = InferSustainableFromMaterial(normalizedMaterial);

            product.IsRecycled = dto.IsRecycled ?? inferredRecycled;
            product.IsSustainable = dto.IsSustainable ?? inferredSustainable;

            product.RecycledPercentage = dto.RecycledPercentage
                ?? EstimateRecycledPercentage(product.Condition, product.IsRecycled, product.IsSustainable);

            product.RecycledPercentage = Math.Clamp(product.RecycledPercentage, 0, 100);

            product.CarbonFootprint = dto.CarbonFootprint
                ?? EstimateCarbonFootprint(product.Category, product.Condition, product.IsRecycled, product.IsSustainable);

            product.CarbonFootprint = Math.Clamp(product.CarbonFootprint, 5d, 95d);
        }

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        private static bool InferRecycledFromMaterial(string material)
        {
            if (string.IsNullOrWhiteSpace(material)) return false;

            return material.Contains("recycle")
                || material.Contains("recycl")
                || material.Contains("upcycl")
                || material.Contains("second hand")
                || material.Contains("seconde main");
        }

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        private static bool InferSustainableFromMaterial(string material)
        {
            if (string.IsNullOrWhiteSpace(material)) return false;

            return material.Contains("organic")
                || material.Contains("biologique")
                || material.Contains("bamboo")
                || material.Contains("fsc")
                || material.Contains("durable")
                || material.Contains("eco");
        }

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        private static int EstimateRecycledPercentage(ProductCondition condition, bool isRecycled, bool isSustainable)
        {
            var baseValue = condition switch
            {
                ProductCondition.New => 20,
                ProductCondition.LikeNew => 35,
                ProductCondition.Good => 45,
                ProductCondition.Fair => 55,
                ProductCondition.ForRecycling => 75,
                _ => 30
            };

            if (isRecycled) baseValue += 20;
            if (isSustainable) baseValue += 10;

            return Math.Clamp(baseValue, 0, 100);
        }

        // Fonctionnalite: Execute la fonctionnalite principale de la methode.
        private static double EstimateCarbonFootprint(ProductCategory category, ProductCondition condition, bool isRecycled, bool isSustainable)
        {
            var categoryBase = category switch
            {
                ProductCategory.Electronics => 52d,
                ProductCategory.Furniture => 42d,
                ProductCategory.Textile => 36d,
                ProductCategory.Sports => 30d,
                ProductCategory.Books => 18d,
                ProductCategory.Other => 28d,
                _ => 30d
            };

            var conditionAdjustment = condition switch
            {
                ProductCondition.New => 8d,
                ProductCondition.LikeNew => 2d,
                ProductCondition.Good => -3d,
                ProductCondition.Fair => -8d,
                ProductCondition.ForRecycling => -12d,
                _ => 0d
            };

            var recycledAdjustment = isRecycled ? -10d : 0d;
            var sustainableAdjustment = isSustainable ? -8d : 0d;

            return categoryBase + conditionAdjustment + recycledAdjustment + sustainableAdjustment;
        }
    }
}

