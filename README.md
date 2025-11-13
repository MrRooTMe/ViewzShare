# ViewzShare

A lightweight ASP.NET Core prototype for collecting client session data and sharing a rich media handoff page.

## API

### POST `/api/session`
Create a session token and persist metadata for the handoff page.

Body fields:

| Field | Type | Notes |
| --- | --- | --- |
| `projectId` | string | Required identifier shown on the hero section. |
| `clientName` | string? | Optional label for internal tracking. |
| `items` | `ApartmentItem[]`? | Optional list of liked apartments displayed in the "דירות שאהבתי" section. |
| `galleryAssets` | `GalleryAsset[]`? | Optional media specifically for the gallery section. When omitted the UI falls back to plan images found in `items`, but producers are encouraged to send dedicated assets going forward. |
| `movieUrl` | string? | Optional hero background video. Defaults to `/movie/intro.mp4`. |
| `splatterUrl` | string? | Optional Gaussian Splatting tour iframe source. |
| `logoUrl` | string? | Optional project logo. Defaults to `/img/logo.svg`. |

`GalleryAsset` objects support the following fields: `imageUrl` and `category`. The `category` value should be one of `Interior`, `Exterior`, or `Public` (values are case-insensitive and default to `Interior`).

`ApartmentItem` objects remain unchanged to preserve compatibility with existing clients.

Example payload:

```json
{
  "projectId": "Tower-18",
  "clientName": "דנה לוי",
  "movieUrl": "/movie/intro.mp4",
  "splatterUrl": "https://splatter.app/s/123",
  "logoUrl": "/img/logo.svg",
  "items": [
    {
      "apartmentId": "12A",
      "title": "Garden Flat",
      "planImageUrl": "/img/plans/12A.jpg",
      "pdfUrl": "/pdf/12A.pdf",
      "rooms": 4,
      "sizeSqm": 112.5
    }
  ],
  "galleryAssets": [
    {
      "imageUrl": "/img/gallery/lobby.jpg",
      "category": "Public"
    }
  ]
}
```

The API responds with `{ "shareUrl": "https://host/v/{token}" }` where `{token}` is the generated session identifier.

### GET `/api/session/{token}`
Return the stored session JSON, including `items` and `galleryAssets`.

### GET `/v/{token}`
Redirect to the Razor page that renders the handoff experience. The gallery section now reads from `galleryAssets`, while the liked-apartment grid continues to use `items`.

## Development

```
dotnet run --project ViewzShare/ViewzShare.csproj
```

The app uses an in-memory store (`SharedStore`). Restarting the process clears all sessions.
