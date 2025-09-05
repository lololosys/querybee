# QueryBee 🐝

A cloud-based SaaS platform that makes database management effortless. Connect your PostgreSQL databases in seconds, view, edit, and manage your data through a beautiful, intuitive interface—without writing a single line of code.

## Features

- **Lightning Fast** - Connect to PostgreSQL databases in seconds
- **Auto-Connect** - Automatic connection using DATABASE_URL environment variable
- **Secure & Safe** - Confirmation dialogs before data changes
- **User Friendly** - No SQL knowledge required, visual data management
- **Real-time Editing** - Click to edit cells directly in the table
- **Schema Explorer** - Browse all tables and their structures
- **Pagination** - Handle large datasets efficiently

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **UI Components**: Shadcn/ui, Tailwind CSS
- **Database**: PostgreSQL with `pg` driver
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or remote)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd querybee
```

2. Install dependencies:

```bash
npm install
```

3. Create environment variables:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your database configuration:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Option 1: Auto-Connect (Recommended)

1. **Set Environment Variable**: Configure `DATABASE_URL` in your `.env.local` file
2. **Auto-Connect**: The app will automatically connect when you open it
3. **Start Managing**: Immediately browse tables and edit data

### Option 2: Manual Connection

1. **Connect to Database**: Enter your PostgreSQL connection details
2. **Test Connection**: Verify your credentials before connecting
3. **Connect**: Establish the database connection

### Managing Data

4. **Browse Tables**: View all tables in your database with column counts
5. **View Data**: Click on any table to see its data with pagination
6. **Edit Data**: Click on any cell to edit its value
7. **Save Changes**: Confirm changes with the built-in confirmation dialog

## Database Connection

### Environment Variable (Recommended)

Set the `DATABASE_URL` environment variable in your `.env.local` file:

```env
DATABASE_URL="postgresql://username:password@hostname:5432/database_name"
```

The app will automatically attempt to connect using this URL when you visit the page.

### Manual Connection

QueryBee also supports manual connection with the following parameters:

- **Host**: Database server hostname or IP
- **Port**: Database port (default: 5432)
- **Database**: Database name
- **Username**: Database username
- **Password**: Database password

## Security Features

- Connection testing before establishing database connections
- Confirmation dialogs for all data modifications
- Safe SQL query execution with parameterized queries
- No direct SQL execution - all operations are controlled through the interface

## Development

### Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes for database operations
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── ui/                # Shadcn UI components
│   ├── database-connection-form.tsx
│   ├── tables-list.tsx
│   └── table-data-viewer.tsx
└── lib/
    ├── database.ts        # Database connection and operations
    └── utils.ts           # Utility functions
```

### API Endpoints

- `POST /api/database/test` - Test database connection
- `POST /api/database/connect` - Establish database connection
- `DELETE /api/database/connect` - Close database connection
- `GET /api/database/tables` - Get list of tables
- `GET /api/database/table-data` - Get table data with pagination
- `PUT /api/database/table-data` - Update table data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.
