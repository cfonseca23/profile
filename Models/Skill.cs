namespace Profile.Models;

public class Skill
{
    public string Category { get; set; } = string.Empty;
    public string Emoji { get; set; } = "⭐";
    public string BadgeClass { get; set; } = "text-bg-secondary";
    public string Description { get; set; } = string.Empty;
    public string CardClass { get; set; } = string.Empty;
    public List<string> Items { get; set; } = [];
}
