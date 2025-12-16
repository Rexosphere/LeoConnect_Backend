import { Router, IRequest } from 'itty-router';
import { json } from '../utils/http';
import { Env } from '../index';
import { withAuth } from '../middleware/auth';

export const eventsRouter = Router();

// ==================== EVENT ENDPOINTS ====================

// Protected: Get All Events
eventsRouter.get('/events', withAuth, async (request: IRequest, env: Env) => {
  const { limit, clubId } = request.query;
  const user = request.user;

  try {
    let query = `
      SELECT e.*, u.display_name as author_name, c.name as club_name
      FROM events e
      LEFT JOIN users u ON e.author_id = u.uid
      LEFT JOIN clubs c ON e.club_id = c.id
    `;
    const params: any[] = [];

    if (clubId) {
      query += ' WHERE e.club_id = ?';
      params.push(clubId);
    }

    query += ' ORDER BY e.event_date ASC LIMIT ?';
    params.push(limit || 20);

    const { results } = await env.DB.prepare(query).bind(...params).all();

    const events = await Promise.all(results.map(async (e: any) => {
      // Check if user has RSVP'd
      const rsvp = await env.DB.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(e.id, user.sub).first();
      const hasRSVPd = !!rsvp;

      // Get RSVP participants
      const rsvpResult = await env.DB.prepare(`
        SELECT u.uid, u.display_name, u.photo_url
        FROM event_rsvps er
        LEFT JOIN users u ON er.user_id = u.uid
        WHERE er.event_id = ?
      `).bind(e.id).all();

      return {
        eventId: e.id,
        clubId: e.club_id,
        clubName: e.club_name,
        authorId: e.author_id,
        authorName: e.author_name,
        name: e.name,
        description: e.description,
        eventDate: e.event_date,
        imageUrl: e.image_url,
        rsvpCount: e.rsvp_count || 0,
        hasRSVPd,
        rsvpParticipants: rsvpResult.results.map((r: any) => ({
          uid: r.uid,
          displayName: r.display_name,
          photoUrl: r.photo_url
        })),
        createdAt: e.created_at,
        updatedAt: e.updated_at
      };
    }));

    return events;
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get Single Event
eventsRouter.get('/events/:id', withAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const event = await env.DB.prepare(`
      SELECT e.*, u.display_name as author_name, c.name as club_name
      FROM events e
      LEFT JOIN users u ON e.author_id = u.uid
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = ?
    `).bind(id).first();

    if (!event) {
      return json(404, { status: 404, error: 'Event not found' });
    }

    // Check if user has RSVP'd
    const rsvp = await env.DB.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(id, user.sub).first();
    const hasRSVPd = !!rsvp;

    // Get RSVP participants
    const rsvpResult = await env.DB.prepare(`
      SELECT u.uid, u.display_name, u.photo_url
      FROM event_rsvps er
      LEFT JOIN users u ON er.user_id = u.uid
      WHERE er.event_id = ?
    `).bind(id).all();

    return {
      eventId: event.id,
      clubId: event.club_id,
      clubName: event.club_name,
      authorId: event.author_id,
      authorName: event.author_name,
      name: event.name,
      description: event.description,
      eventDate: event.event_date,
      imageUrl: event.image_url,
      rsvpCount: event.rsvp_count || 0,
      hasRSVPd,
      rsvpParticipants: rsvpResult.results.map((r: any) => ({
        uid: r.uid,
        displayName: r.display_name,
        photoUrl: r.photo_url
      })),
      createdAt: event.created_at,
      updatedAt: event.updated_at
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Create Event
eventsRouter.post('/events', withAuth, async (request: IRequest, env: Env) => {
  const content = await request.json() as any;
  const user = request.user;

  try {
    // Check if user is verified
    const currentUser = await env.DB.prepare('SELECT is_verified FROM users WHERE uid = ?').bind(user.sub).first();
    if (!currentUser || currentUser.is_verified !== 1) {
      return json(403, { status: 403, error: 'You must verify your Leo ID before creating events' });
    }

    // Input validation
    if (!content.name || typeof content.name !== 'string') {
      return json(400, { status: 400, error: 'Event name is required' });
    }

    if (!content.description || typeof content.description !== 'string') {
      return json(400, { status: 400, error: 'Event description is required' });
    }

    if (!content.eventDate) {
      return json(400, { status: 400, error: 'Event date is required' });
    }

    const trimmedName = content.name.trim();
    if (trimmedName.length === 0) {
      return json(400, { status: 400, error: 'Event name cannot be empty' });
    }

    if (trimmedName.length > 200) {
      return json(400, { status: 400, error: 'Event name exceeds maximum length of 200 characters' });
    }

    const trimmedDescription = content.description.trim();
    if (trimmedDescription.length === 0) {
      return json(400, { status: 400, error: 'Event description cannot be empty' });
    }

    if (trimmedDescription.length > 5000) {
      return json(400, { status: 400, error: 'Event description exceeds maximum length of 5000 characters' });
    }

    // Validate image size if provided (max 10MB base64)
    if (content.imageBytes && content.imageBytes.length > 13333333) {
      return json(400, { status: 400, error: 'Image size exceeds maximum of 10MB' });
    }

    let imageUrl = null;

    // Handle Image Upload to Discord (same as post creation)
    if (content.imageBytes && content.imageBytes.length > 0) {
      try {
        // Decode base64 image data
        const imageData = Uint8Array.from(atob(content.imageBytes), c => c.charCodeAt(0));

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const extension = content.imageMimeType?.split('/')[1] || 'jpg';
        const filename = `event-${timestamp}-${randomId}.${extension}`;

        // Create FormData for Discord webhook
        const formData = new FormData();
        const blob = new Blob([imageData], { type: content.imageMimeType || 'image/jpeg' });
        formData.append('file', blob, filename);

        // Upload to Discord webhook
        const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          body: formData
        });

        if (!discordResponse.ok) {
          throw new Error(`Discord upload failed: ${discordResponse.statusText}`);
        }

        const discordJson = await discordResponse.json() as any;
        const attachment = discordJson.attachments?.[0];

        if (!attachment?.url) {
          throw new Error('No attachment URL in Discord response');
        }

        // Store the Discord CDN URL directly in database
        imageUrl = attachment.url;
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        // Continue without image if upload fails
      }
    }

    let clubId = content.clubId;
    if (!clubId) {
      // Assign random club if not provided
      const randomClub = await env.DB.prepare('SELECT id FROM clubs ORDER BY RANDOM() LIMIT 1').first();
      if (randomClub) {
        clubId = randomClub.id;
      } else {
        return json(400, { status: 400, error: 'No clubs available to assign event to' });
      }
    }

    const eventId = `event-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO events (id, club_id, author_id, name, description, event_date, image_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventId,
      clubId,
      user.sub,
      content.name,
      content.description,
      content.eventDate,
      imageUrl,
      now,
      now
    ).run();

    // Return full Event object with joins
    const newEvent = await env.DB.prepare(`
      SELECT e.*, u.display_name as author_name, c.name as club_name
      FROM events e
      LEFT JOIN users u ON e.author_id = u.uid
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = ?
    `).bind(eventId).first();

    if (!newEvent) {
      return json(500, { status: 500, error: 'Failed to create event' });
    }

    return {
      eventId: newEvent.id,
      clubId: newEvent.club_id,
      clubName: newEvent.club_name,
      authorId: newEvent.author_id,
      authorName: newEvent.author_name,
      name: newEvent.name,
      description: newEvent.description,
      eventDate: newEvent.event_date,
      imageUrl: newEvent.image_url,
      rsvpCount: 0,
      hasRSVPd: false,
      rsvpParticipants: [],
      createdAt: newEvent.created_at,
      updatedAt: newEvent.updated_at
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Update Event
eventsRouter.put('/events/:id', withAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const content = await request.json() as any;
  const user = request.user;

  try {
    // Get the event to verify ownership
    const event = await env.DB.prepare('SELECT author_id FROM events WHERE id = ?').bind(id).first();

    if (!event) {
      return json(404, { status: 404, error: 'Event not found' });
    }

    // Check if user is the author or a webmaster (admin)
    const currentUser = await env.DB.prepare('SELECT is_webmaster FROM users WHERE uid = ?').bind(user.sub).first();
    const isWebmaster = currentUser && currentUser.is_webmaster === 1;

    if (event.author_id !== user.sub && !isWebmaster) {
      return json(403, { status: 403, error: 'You can only update your own events' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (content.name !== undefined) {
      if (content.name.trim().length === 0) {
        return json(400, { status: 400, error: 'Event name cannot be empty' });
      }
      if (content.name.length > 200) {
        return json(400, { status: 400, error: 'Event name exceeds maximum length of 200 characters' });
      }
      updates.push('name = ?');
      params.push(content.name);
    }

    if (content.description !== undefined) {
      if (content.description.trim().length === 0) {
        return json(400, { status: 400, error: 'Event description cannot be empty' });
      }
      if (content.description.length > 5000) {
        return json(400, { status: 400, error: 'Event description exceeds maximum length of 5000 characters' });
      }
      updates.push('description = ?');
      params.push(content.description);
    }

    if (content.eventDate !== undefined) {
      updates.push('event_date = ?');
      params.push(content.eventDate);
    }

    // Handle Image Upload if provided
    if (content.imageBytes && content.imageBytes.length > 0) {
      if (content.imageBytes.length > 13333333) {
        return json(400, { status: 400, error: 'Image size exceeds maximum of 10MB' });
      }

      try {
        const imageData = Uint8Array.from(atob(content.imageBytes), c => c.charCodeAt(0));
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const extension = content.imageMimeType?.split('/')[1] || 'jpg';
        const filename = `event-${timestamp}-${randomId}.${extension}`;

        const formData = new FormData();
        const blob = new Blob([imageData], { type: content.imageMimeType || 'image/jpeg' });
        formData.append('file', blob, filename);

        const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          body: formData
        });

        if (discordResponse.ok) {
          const discordJson = await discordResponse.json() as any;
          const attachment = discordJson.attachments?.[0];
          if (attachment?.url) {
            updates.push('image_url = ?');
            params.push(attachment.url);
          }
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
      }
    }

    if (updates.length === 0) {
      return json(400, { status: 400, error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await env.DB.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

    // Return updated event
    const updatedEvent = await env.DB.prepare(`
      SELECT e.*, u.display_name as author_name, c.name as club_name
      FROM events e
      LEFT JOIN users u ON e.author_id = u.uid
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = ?
    `).bind(id).first();

    if (!updatedEvent) {
      return json(500, { status: 500, error: 'Failed to fetch updated event' });
    }

    // Check if user has RSVP'd
    const rsvp = await env.DB.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(id, user.sub).first();
    const hasRSVPd = !!rsvp;

    // Get RSVP participants
    const rsvpResult = await env.DB.prepare(`
      SELECT u.uid, u.display_name, u.photo_url
      FROM event_rsvps er
      LEFT JOIN users u ON er.user_id = u.uid
      WHERE er.event_id = ?
    `).bind(id).all();

    return {
      eventId: updatedEvent.id,
      clubId: updatedEvent.club_id,
      clubName: updatedEvent.club_name,
      authorId: updatedEvent.author_id,
      authorName: updatedEvent.author_name,
      name: updatedEvent.name,
      description: updatedEvent.description,
      eventDate: updatedEvent.event_date,
      imageUrl: updatedEvent.image_url,
      rsvpCount: updatedEvent.rsvp_count || 0,
      hasRSVPd,
      rsvpParticipants: rsvpResult.results.map((r: any) => ({
        uid: r.uid,
        displayName: r.display_name,
        photoUrl: r.photo_url
      })),
      createdAt: updatedEvent.created_at,
      updatedAt: updatedEvent.updated_at
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Delete Event
eventsRouter.delete('/events/:id', withAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Get the event to verify ownership
    const event = await env.DB.prepare('SELECT author_id FROM events WHERE id = ?').bind(id).first();

    if (!event) {
      return json(404, { status: 404, error: 'Event not found' });
    }

    // Check if user is the author or a webmaster (admin)
    const currentUser = await env.DB.prepare('SELECT is_webmaster FROM users WHERE uid = ?').bind(user.sub).first();
    const isWebmaster = currentUser && currentUser.is_webmaster === 1;

    if (event.author_id !== user.sub && !isWebmaster) {
      return json(403, { status: 403, error: 'You can only delete your own events' });
    }

    // Delete related data first (RSVPs)
    await env.DB.prepare('DELETE FROM event_rsvps WHERE event_id = ?').bind(id).run();

    // Delete the event
    await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

    return { success: true, message: 'Event deleted successfully' };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: RSVP to Event (Toggle)
eventsRouter.post('/events/:id/rsvp', withAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if event exists
    const event = await env.DB.prepare('SELECT id, rsvp_count FROM events WHERE id = ?').bind(id).first();
    if (!event) {
      return json(404, { status: 404, error: 'Event not found' });
    }

    // Check if user already RSVP'd
    const existingRSVP = await env.DB.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(id, user.sub).first();

    let hasRSVPd = false;
    let newRSVPCount = (event.rsvp_count as number) || 0;

    if (existingRSVP) {
      // Remove RSVP
      await env.DB.prepare('DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(id, user.sub).run();
      newRSVPCount = Math.max(0, newRSVPCount - 1);
      hasRSVPd = false;
    } else {
      // Add RSVP
      await env.DB.prepare('INSERT INTO event_rsvps (event_id, user_id) VALUES (?, ?)').bind(id, user.sub).run();
      newRSVPCount = newRSVPCount + 1;
      hasRSVPd = true;
    }

    // Update RSVP count on event
    await env.DB.prepare('UPDATE events SET rsvp_count = ? WHERE id = ?').bind(newRSVPCount, id).run();

    return {
      message: hasRSVPd ? `RSVP'd to event ${id}` : `Removed RSVP from event ${id}`,
      rsvpCount: newRSVPCount,
      hasRSVPd
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});
