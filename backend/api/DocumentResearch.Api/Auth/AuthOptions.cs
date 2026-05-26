namespace DocumentResearch.Api.Auth;

public sealed class AuthOptions
{
    public GoogleOptions Google { get; set; } = new();
    public JwtOptions Jwt { get; set; } = new();

    public sealed class GoogleOptions
    {
        public string ClientId { get; set; } = string.Empty;
    }

    public sealed class JwtOptions
    {
        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
        public string SigningKey { get; set; } = string.Empty;
        public int LifetimeDays { get; set; } = 7;
    }
}
