import postgres from 'postgres';
import bcrypt from 'bcrypt';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function GET() {
  try {
    await sql.begin(async (sql) => {
      // Tabel Users (Untuk Login nanti)
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        );
      `;

      // Tabel Customers
      await sql`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50) UNIQUE,
          address TEXT,
          transaction_frequency INT DEFAULT 0,
          total_spent NUMERIC(15, 0) DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Tabel Invoices (using transactions as invoices)
      await sql`
        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(50) PRIMARY KEY,
          customer_id UUID REFERENCES customers(id),
          total_amount NUMERIC(15, 0) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Tabel Revenue
      await sql`
        CREATE TABLE IF NOT EXISTS revenue (
          month VARCHAR(4) NOT NULL UNIQUE,
          revenue INT NOT NULL
        );
      `;

      // Tabel Stocks
      await sql`
        CREATE TABLE IF NOT EXISTS stocks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          unit VARCHAR(20) NOT NULL,
          stock INT DEFAULT 0,
          min_stock INT DEFAULT 0,
          price_per_unit NUMERIC(15, 0) DEFAULT 0,
          supplier VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Tabel Menus
      await sql`
        CREATE TABLE IF NOT EXISTS menus (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC(15, 0) DEFAULT 0,
          sold_count INT DEFAULT 0,
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Tabel Resep
      await sql`
        CREATE TABLE IF NOT EXISTS menu_recipes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
          stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
          amount_needed INT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_menu_stock UNIQUE (menu_id, stock_id)
        );
      `;

      // Tabel Detail Item
      await sql`
        CREATE TABLE IF NOT EXISTS transaction_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          transaction_id VARCHAR(50) REFERENCES transactions(id) ON DELETE CASCADE,
          menu_id UUID REFERENCES menus(id),
          quantity INT NOT NULL,
          price_at_time NUMERIC(15, 0) NOT NULL,
          subtotal NUMERIC(15, 0) NOT NULL
        );
      `;

      // Insert dummy data
      // Users
      const hashedPassword = await bcrypt.hash('password123', 10);
      await sql`
        INSERT INTO users (name, email, password) VALUES
        ('Admin User', 'admin@example.com', ${hashedPassword})
        ON CONFLICT (email) DO NOTHING;
      `;

      // Customers
      await sql`
        INSERT INTO customers (name, phone, address, transaction_frequency, total_spent) VALUES
        ('John Doe', '1234567890', '123 Main St', 5, 50000),
        ('Jane Smith', '0987654321', '456 Elm St', 3, 30000),
        ('Bob Johnson', '1122334455', '789 Oak St', 2, 20000)
        ON CONFLICT (phone) DO NOTHING;
      `;

      // Invoices (Transactions)
      await sql`
        INSERT INTO transactions (id, customer_id, total_amount) VALUES
        ('INV001', (SELECT id FROM customers WHERE name = 'John Doe' LIMIT 1), 25000),
        ('INV002', (SELECT id FROM customers WHERE name = 'Jane Smith' LIMIT 1), 15000),
        ('INV003', (SELECT id FROM customers WHERE name = 'Bob Johnson' LIMIT 1), 10000)
        ON CONFLICT (id) DO NOTHING;
      `;

      // Revenue
      await sql`
        INSERT INTO revenue (month, revenue) VALUES
        ('01', 5000),
        ('02', 6000),
        ('03', 7000),
        ('04', 8000),
        ('05', 9000),
        ('06', 10000),
        ('07', 11000),
        ('08', 12000),
        ('09', 13000),
        ('10', 14000),
        ('11', 15000),
        ('12', 16000)
        ON CONFLICT (month) DO NOTHING;
      `;
    });

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
