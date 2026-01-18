"""
Add grondrecht and oppervlakte fields to property table
Run this after updating models.py
"""

from app import app, db
from sqlalchemy import text


def add_property_fields():
    with app.app_context():
        with db.engine.connect() as conn:
            # Check existing columns
            result = conn.execute(text("PRAGMA table_info(property)"))
            existing_columns = [row[1] for row in result]

            # Add grondrecht if not exists
            if "grondrecht" not in existing_columns:
                print("Adding grondrecht column...")
                conn.execute(
                    text("ALTER TABLE property ADD COLUMN grondrecht VARCHAR(20)")
                )

            # Add perceel_oppervlakte if not exists
            if "perceel_oppervlakte" not in existing_columns:
                print("Adding perceel_oppervlakte column...")
                conn.execute(
                    text("ALTER TABLE property ADD COLUMN perceel_oppervlakte FLOAT")
                )

            # Add perceel_eenheid if not exists
            if "perceel_eenheid" not in existing_columns:
                print("Adding perceel_eenheid column...")
                conn.execute(
                    text("ALTER TABLE property ADD COLUMN perceel_eenheid VARCHAR(10)")
                )

            # Add woon_oppervlakte if not exists
            if "woon_oppervlakte" not in existing_columns:
                print("Adding woon_oppervlakte column...")
                conn.execute(
                    text("ALTER TABLE property ADD COLUMN woon_oppervlakte FLOAT")
                )

            # Add woon_eenheid if not exists
            if "woon_eenheid" not in existing_columns:
                print("Adding woon_eenheid column...")
                conn.execute(
                    text("ALTER TABLE property ADD COLUMN woon_eenheid VARCHAR(10)")
                )

            conn.commit()
            print("✅ All property fields added successfully!")


if __name__ == "__main__":
    print("Starting migration...")
    add_property_fields()
    print("Migration complete!")
