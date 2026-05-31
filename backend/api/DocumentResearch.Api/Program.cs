using System.Text;
using System.Text.Json;
using Asp.Versioning;
using DocumentResearch.Api.Auth;
using DocumentResearch.Api.Data;
using DocumentResearch.Api.Services;
using DocumentResearch.Api.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

const string DevCorsPolicy = "dev-spa";
builder.Services.AddCors(o => o.AddPolicy(DevCorsPolicy, p => p
    .WithOrigins("http://localhost:4200")
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        o.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    });

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    o.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
});

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

builder.Services
    .AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = false;
        options.ReportApiVersions = true;
        options.ApiVersionReader = new UrlSegmentApiVersionReader();
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'V";
        options.SubstituteApiVersionInUrl = true;
    });

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IDocumentIngestionTrigger, HttpDocumentIngestionTrigger>();
builder.Services
    .AddHttpClient(HttpDocumentIngestionTrigger.HttpClientName, c =>
    {
        c.BaseAddress = new Uri(builder.Configuration["Core:BaseUrl"] ?? "http://localhost:8000");
        c.Timeout = TimeSpan.FromSeconds(5);
    });

builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection("Auth"));
builder.Services.Configure<CoreOptions>(builder.Configuration.GetSection(CoreOptions.SectionName));
builder.Services.Configure<DocumentUploadOptions>(builder.Configuration.GetSection(DocumentUploadOptions.SectionName));
builder.Services.Configure<MinioOptions>(builder.Configuration.GetSection(MinioOptions.SectionName));
builder.Services.AddSingleton<IFileStorage, MinioFileStorage>();
if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddHostedService<MinioBucketInitializer>();
}
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IGoogleTokenVerifier, GoogleTokenVerifier>();
builder.Services.AddSingleton<IJwtIssuer, JwtIssuer>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services
    .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<AuthOptions>>((opts, authAccessor) =>
    {
        var jwt = authAccessor.Value.Jwt;
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = string.IsNullOrEmpty(jwt.SigningKey)
                ? null
                : new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        opts.Events = new JwtBearerEvents
        {
            // Browser EventSource cannot send an Authorization header, so the SSE
            // ingestion stream authenticates via the access_token query parameter.
            // Restricted to that single path to limit token-in-URL exposure.
            OnMessageReceived = context =>
            {
                var path = context.HttpContext.Request.Path;
                if (string.IsNullOrEmpty(context.Token)
                    && path.HasValue
                    && path.Value.EndsWith("/ingestion/stream", StringComparison.OrdinalIgnoreCase))
                {
                    var accessToken = context.Request.Query["access_token"].ToString();
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        context.Token = accessToken;
                    }
                }

                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        options.UseNpgsql(connectionString);
    }
});

var app = builder.Build();

await SeedData.InitializeAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseExceptionHandler();
app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCorsPolicy);
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
