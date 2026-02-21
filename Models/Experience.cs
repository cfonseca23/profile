namespace Profile.Models;

public class Experience
{
    private static readonly string[] MonthNames =
    [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    public int StartMonth { get; set; } = 1;
    public int StartYear { get; set; }
    public int? EndMonth { get; set; }
    public int? EndYear { get; set; }
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Highlights { get; set; } = [];
    public List<string> Technologies { get; set; } = [];

    public string Period
    {
        get
        {
            var startLabel = $"{GetMonthName(StartMonth)} {StartYear}";
            var endLabel = EndYear.HasValue
                ? $"{GetMonthName(EndMonth ?? 12)} {EndYear.Value}"
                : "presente";

            return $"{startLabel} - {endLabel}";
        }
    }

    public string Duration
    {
        get
        {
            var start = new DateTime(StartYear, ClampMonth(StartMonth), 1);
            var end = EndYear.HasValue
                ? new DateTime(EndYear.Value, ClampMonth(EndMonth ?? 12), 1)
                : new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);

            if (end < start)
            {
                return "0 meses";
            }

            var totalMonths = ((end.Year - start.Year) * 12) + (end.Month - start.Month) + 1;
            var years = totalMonths / 12;
            var months = totalMonths % 12;

            if (years > 0 && months > 0)
            {
                return $"{years} {(years == 1 ? "año" : "años")} {months} {(months == 1 ? "mes" : "meses")}";
            }

            if (years > 0)
            {
                return $"{years} {(years == 1 ? "año" : "años")}";
            }

            return $"{months} {(months == 1 ? "mes" : "meses")}";
        }
    }

    private static int ClampMonth(int month) => month is < 1 or > 12 ? 1 : month;

    private static string GetMonthName(int month) => MonthNames[ClampMonth(month) - 1];
}
