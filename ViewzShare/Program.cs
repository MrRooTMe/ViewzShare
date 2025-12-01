using Microsoft.AspNetCore.Http.Extensions;
using System.Collections.Concurrent;
using System.Linq;
using System.Text.Json.Serialization;





var builder = WebApplication.CreateBuilder(args);

// Razor Pages to render the view
builder.Services.AddRazorPages();

// CORS (so UE5 can POST from anywhere while you prototype)
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
	.AllowAnyOrigin()
	.AllowAnyHeader()
	.AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
app.UseStaticFiles();
app.MapRazorPages();

// In-memory store (replace with DB later)
var store = new ConcurrentDictionary<string, SessionDto>();

SharedStore.Instance = store; // add this line (and make Instance settable)

app.UseMiddleware<TrafficLoggingMiddleware>();


app.MapPost("/api/session", (CreateSessionDto dto, HttpContext http) =>
{
	var token = Guid.NewGuid().ToString("N")[..12];

        var session = new SessionDto
        {
                Token = token,
                ProjectId = dto.ProjectId,
                ClientName = dto.ClientName,
                Items = dto.Items ?? new(),
                GalleryAssets = dto.GalleryAssets?.Where(asset => asset is not null).Select(asset => asset!).ToList() ?? new(),

                // pick defaults if caller didn't send them
                MovieUrl = string.IsNullOrWhiteSpace(dto.MovieUrl) ? "/movie/intro.mp4" : dto.MovieUrl,
                SplatterUrl = dto.SplatterUrl,
                LogoUrl = string.IsNullOrWhiteSpace(dto.LogoUrl) ? "/img/logo.svg" : dto.LogoUrl,
	};

	SharedStore.Instance[token] = session;

	var baseUrl = $"{http.Request.Scheme}://{http.Request.Host}";
	return Results.Ok(new { shareUrl = $"{baseUrl}/v/{token}" }); // short link only
});


// GET /api/session/{token} -> JSON (optional, useful for a JS frontend)
app.MapGet("/api/session/{token}", (string token) =>
{
	return Results.Extensions.TryGet(SharedStore.Instance, token, out var session)
		? Results.Ok(session)
		: Results.NotFound();
});


// Page route: /v/{token} -> Razor page reads from memory
//using Microsoft.AspNetCore.Http; // QueryString

app.MapGet("/v/{token}", (string token, HttpContext ctx) =>
{
	var qb = new QueryBuilder { { "token", token } };

	// append all incoming query params EXCEPT "token"
	foreach (var kv in ctx.Request.Query)
	{
		if (!string.Equals(kv.Key, "token", StringComparison.OrdinalIgnoreCase))
		{
			foreach (var v in kv.Value)
				qb.Add(kv.Key, v);
		}
	}

	return Results.Redirect($"/ViewSession{qb.ToQueryString()}");
});


app.Run();



// Create request payload (now supports optional gallery/movie/splatter/logo)
public record CreateSessionDto(
        [property: JsonPropertyName("projectId")] string ProjectId,
        [property: JsonPropertyName("clientName")] string? ClientName,
        [property: JsonPropertyName("items")] List<ApartmentItem>? Items = null,
        [property: JsonPropertyName("galleryAssets")] List<GalleryAsset>? GalleryAssets = null,

        // NEW (all optional):
        [property: JsonPropertyName("movieUrl")] string? MovieUrl = null,      // e.g. "/movie/intro.mp4"
        [property: JsonPropertyName("splatterUrl")] string? SplatterUrl = null,   // e.g. "https://splatter.app/s/..."
        [property: JsonPropertyName("logoUrl")] string? LogoUrl = null        // e.g. "/img/logo.svg"
);

public class SessionDto
{
        public string Token { get; set; } = default!;
        public string ProjectId { get; set; } = default!;
        public string? ClientName { get; set; }
        public List<ApartmentItem> Items { get; set; } = new();
        public List<GalleryAsset> GalleryAssets { get; set; } = new();

        // NEW: stored server-side so the short link /v/{token} doesn't need query params
        public string? MovieUrl { get; set; }      // defaults handled in Program.cs or the page
        public string? SplatterUrl { get; set; }
        public string? LogoUrl { get; set; }
}

public class ApartmentItem
{
        public string ApartmentId { get; set; } = default!;
        public string? Title { get; set; }
        public string? PlanImageUrl { get; set; }
        public string? PdfUrl { get; set; }
        public float? SizeSqm { get; set; }
        public int? Rooms { get; set; }
}

public class GalleryAsset
{
        public string? Category { get; set; }
        public string? ImageUrl { get; set; }
}

// tiny helper
static class ResultsExtensions
{
	public static bool TryGet<TKey, TValue>(this IResultExtensions _, ConcurrentDictionary<TKey, TValue> dict, TKey key, out TValue value)
		where TKey : notnull
		=> dict.TryGetValue(key, out value!);
}


public class TrafficLoggingMiddleware
{
	private readonly RequestDelegate _next;
	private readonly ILogger<TrafficLoggingMiddleware> _logger;

	public TrafficLoggingMiddleware(RequestDelegate next, ILogger<TrafficLoggingMiddleware> logger)
	{
		_next = next;
		_logger = logger;
	}

	public async Task Invoke(HttpContext context)
	{
		long requestBytes = context.Request.ContentLength ?? 0;

		// Read response body size
		var originalBody = context.Response.Body;
		using var newBody = new MemoryStream();
		context.Response.Body = newBody;

		await _next(context);

		newBody.Seek(0, SeekOrigin.Begin);
		long responseBytes = newBody.Length;

		// Log total traffic
		double totalKb = (requestBytes + responseBytes) / 1024.0;

		_logger.LogInformation($"Traffic: {totalKb:F2} KB - {context.Request.Method} {context.Request.Path}");

		// Write response back
		newBody.Seek(0, SeekOrigin.Begin);
		await newBody.CopyToAsync(originalBody);
		context.Response.Body = originalBody;
	}
}


