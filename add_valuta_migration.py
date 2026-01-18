"""
Database Migration Script
Run this to add valuta column to existing database
"""

from app import app, db
from sqlalchemy import text


def migrate_add_valuta():
    with app.app_context():
        try:
            # Add valuta column with default value 'SRD'
            with db.engine.connect() as conn:
                # Check if column exists
                result = conn.execute(text("PRAGMA table_info(property)"))
                columns = [row[1] for row in result]

                if "valuta" not in columns:
                    print("Adding valuta column...")
                    conn.execute(
                        text(
                            "ALTER TABLE property ADD COLUMN valuta VARCHAR(3) DEFAULT 'SRD' NOT NULL"
                        )
                    )
                    conn.commit()
                    print("✅ Valuta column added successfully!")
                else:
                    print("⚠️  Valuta column already exists")

        except Exception as e:
            print(f"❌ Error during migration: {e}")
            raise


if __name__ == "__main__":
    print("Starting database migration...")
    migrate_add_valuta()
    print("Migration complete!")
