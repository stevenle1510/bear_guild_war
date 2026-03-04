# Postman API Testing Guide

This file documents the current backend contract for registrations and teams.

## 1. Start backend

```bash
npm run dev
```

Default local URL:

- `http://127.0.0.1:8787`

## 2. Postman environment

Create environment `Guild Local`:

- `baseUrl` = `http://127.0.0.1:8787`
- `adminToken` = (empty)
- `registrationId` = (empty)
- `teamId` = (empty)

## 3. Public APIs (no login required)

### Health

- Method: `GET`
- URL: `{{baseUrl}}/`

### Create registration

- Method: `POST`
- URL: `{{baseUrl}}/registrations`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "name": "PlayerOne",
  "role": "dps",
  "primaryClass": ["strategicSword", "heavenquakerSpear"],
  "secondaryClass": ["namelessSword", "namelessSpear"],
  "primary_role": "Frontline",
  "secondary_role": "Support",
  "note": "Available all day",
  "participations": [
    {
      "day": "Saturday",
      "time_slots": ["20:00-20:30", "20:30-21:00"]
    },
    {
      "day": "Sunday",
      "time_slots": ["21:00-21:30"]
    }
  ]
}
```

- Success response: `201` with `{ ids: number[], message: string }`

### List registrations

- Method: `GET`
- URL examples:
  - `{{baseUrl}}/registrations`
  - `{{baseUrl}}/registrations?day=Saturday`
  - `{{baseUrl}}/registrations?day=Sunday&assignment=unassigned`
- Query:
  - `day`: `Saturday` | `Sunday` (optional)
  - `assignment`: `all` | `assigned` | `unassigned` (optional, default `all`)
- Success response: `200` with `{ data: Registration[] }`

### List teams by day

- Method: `GET`
- URL examples:
  - `{{baseUrl}}/teams?day=Saturday`
  - `{{baseUrl}}/teams?day=Sunday`
- Query:
  - `day`: required (`Saturday` | `Sunday`)
- Success response: `200` with `{ day, teams }`

## 4. Admin authentication

### Login

- Method: `POST`
- URL: `{{baseUrl}}/admin/login`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "username": "adminaccount",
  "password": "admin123!@"
}
```

- Success response: `200` with `{ token, tokenType, expiresAt }`

Save `token` to `adminToken`.

### Logout

- Method: `POST`
- URL: `{{baseUrl}}/admin/logout`
- Headers:
  - `Authorization: Bearer {{adminToken}}`

## 5. Admin registration management

### List registrations (admin)

- Method: `GET`
- URL examples:
  - `{{baseUrl}}/admin/registrations`
  - `{{baseUrl}}/admin/registrations?day=Saturday`
  - `{{baseUrl}}/admin/registrations?day=Sunday&assignment=assigned`
- Headers:
  - `Authorization: Bearer {{adminToken}}`

### Assign registration to team

- Method: `PATCH`
- URL: `{{baseUrl}}/admin/registrations/{{registrationId}}/team`
- Headers:
  - `Authorization: Bearer {{adminToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "teamId": 1
}
```

### Unassign registration

- Method: `PATCH`
- URL: `{{baseUrl}}/admin/registrations/{{registrationId}}/team`
- Headers:
  - `Authorization: Bearer {{adminToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "teamId": null
}
```

## 6. Admin team management

### List teams by day (admin)

- Method: `GET`
- URL examples:
  - `{{baseUrl}}/admin/teams?day=Saturday`
  - `{{baseUrl}}/admin/teams?day=Sunday`
- Headers:
  - `Authorization: Bearer {{adminToken}}`

### Create team

- Method: `POST`
- URL: `{{baseUrl}}/admin/teams`
- Headers:
  - `Authorization: Bearer {{adminToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "day": "Saturday",
  "name": "Saturday Team X"
}
```

- Success response: `201` with `{ team }`

Save `team.id` to `teamId`.

### Update team

- Method: `PATCH`
- URL: `{{baseUrl}}/admin/teams/{{teamId}}`
- Headers:
  - `Authorization: Bearer {{adminToken}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "name": "Saturday Team Alpha"
}
```

- Notes:
  - Only `name` is currently updatable.
  - Sending no updatable fields returns `400`.

### Delete team

- Method: `DELETE`
- URL: `{{baseUrl}}/admin/teams/{{teamId}}`
- Headers:
  - `Authorization: Bearer {{adminToken}}`

### Reset guild war

- Method: `POST`
- URL: `{{baseUrl}}/admin/guild-war/reset`
- Headers:
  - `Authorization: Bearer {{adminToken}}`
- Effect:
  - Clears all registrations and assignments
  - Recreates default teams for both days

## 7. Validation and behavior notes

- `day` must be `Saturday` or `Sunday`.
- Valid `role` values: `dps`, `healer`, `tank`.
- `primaryClass` must be an array with exactly 2 values from class enum.
- `secondaryClass` (optional) must be an array with exactly 2 values from class enum.
- Valid `time_slot` values:
  - `20:30-21:00`
  - `21:00-21:30`
  - `21:30-22:00`
  - `22:00-22:30`
  - `22:30-23:00`
- `assignment` query must be one of: `all`, `assigned`, `unassigned`.
- Team assignment day must match registration day.

## 8. Recommended test flow

1. `POST /admin/login`
2. `POST /registrations`
3. `GET /registrations?day=Saturday`
4. `POST /admin/teams`
5. `PATCH /admin/registrations/{{registrationId}}/team`
6. `GET /admin/teams?day=Saturday`
7. `POST /admin/guild-war/reset` (optional)
8. `POST /admin/logout`
