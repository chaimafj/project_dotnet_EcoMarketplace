using EcoMarketplace.API.Helpers.DTOs;
using EcoMarketplace.API.Models;

namespace EcoMarketplace.API.Services
{
    public interface IEcoScoreService
    {
        EcoScoreBreakdownDto Calculate(Product product);
    }
}


