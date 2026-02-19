namespace Profile.Models;

public class Education
{
    public int StartYear { get; set; }
    public int EndYear { get; set; }
    public string Institution { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;

    public string Period => $"{StartYear} - {EndYear}";
}
