using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

public class ViewSessionModel : PageModel
{
	private readonly ConcurrentDictionary<string, SessionDto> _store;
	public SessionDto? Session { get; private set; }

	// Displayed in the sticky logo
	public string Title => "שיתוף פרויקט";

	// Default resources for the three sections (can be overridden via query)
	public string MovieUrl { get; private set; } = "/movie/intro.mp4";
	public string? SplatterUrl { get; private set; }
	public string LogoUrl { get; private set; } = "/logo.svg";

	public ViewSessionModel()
	{
		// Reuse the global in-memory store
		_store = SharedStore.Instance;
	}

	// Accepts token plus optional movie/splat/logo overrides
	public IActionResult OnGet(
		[FromQuery] string token,
		[FromQuery] string? movie,
		[FromQuery] string? splat,
		[FromQuery] string? logo)
	{
		if (string.IsNullOrWhiteSpace(token) || !_store.TryGetValue(token, out var session))
			return NotFound();

		Session = session;

		// Priority: query > stored session > defaults
		MovieUrl = !string.IsNullOrWhiteSpace(movie) ? movie! : (session.MovieUrl ?? "/movie/intro.mp4");
		SplatterUrl = !string.IsNullOrWhiteSpace(splat) ? splat : session.SplatterUrl;
		LogoUrl = !string.IsNullOrWhiteSpace(logo) ? logo! : (session.LogoUrl ?? "/img/logo.svg");


		return Page();
	}
}

// Cheap static singleton to hold sessions
public class SharedStore
{
	public static ConcurrentDictionary<string, SessionDto> Instance { get; set; } = new();
}
