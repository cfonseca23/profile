namespace Profile.Models;

public class Experience
{
    public int StartYear { get; set; }
    public int? EndYear { get; set; }
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Technologies { get; set; } = [];

    public string Period => EndYear.HasValue
        ? $"{StartYear} - {EndYear}"
        : $"{StartYear} - Presente";
}
