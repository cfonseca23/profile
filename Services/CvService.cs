using System.Net.Http.Json;
using Profile.Models;

namespace Profile.Services;

public class CvService(HttpClient http)
{
    private CvData? _data;

    public async Task<CvData> GetCvDataAsync()
    {
        _data ??= await http.GetFromJsonAsync<CvData>("data/cv.json");
        return _data ?? new CvData();
    }
}
