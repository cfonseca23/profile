namespace Profile.Models;

public class CvData
{
    public PersonalInfo Personal { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? CvUrl { get; set; }
    public List<Skill> Skills { get; set; } = [];
    public List<Experience> Experiences { get; set; } = [];
    public List<Education> Education { get; set; } = [];
    public List<string> Certifications { get; set; } = [];

    public int YearsOfExperience =>
        Experiences.Count > 0
            ? DateTime.Now.Year - Experiences.Min(e => e.StartYear)
            : 0;

    public string GetSummary() =>
        Summary.Replace("{years}", YearsOfExperience.ToString());
}
