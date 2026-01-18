from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


# --------------------------------------------------
# USER
# --------------------------------------------------


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    naam = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(200), nullable=False)

    properties = db.relationship(
        "Property",
        backref="owner",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


# --------------------------------------------------
# PROPERTY
# --------------------------------------------------


class Property(db.Model):
    __tablename__ = "property"

    id = db.Column(db.Integer, primary_key=True)

    titel = db.Column(db.String(200), nullable=False)
    type_object = db.Column(db.String(50), nullable=False, index=True)
    status = db.Column(db.String(50), nullable=False, index=True)

    prijs = db.Column(db.Float, nullable=False, index=True)
    valuta = db.Column(db.String(3), nullable=False, default="SRD", index=True)

    # NEW: Grondrecht (title/ownership type)
    grondrecht = db.Column(
        db.String(20), nullable=True, index=True
    )  # eigendom, erfpacht, grondhuur

    # NEW: Oppervlaktes
    perceel_oppervlakte = db.Column(db.Float, nullable=True)  # Land area
    perceel_eenheid = db.Column(db.String(10), nullable=True)  # m2 or hectare
    woon_oppervlakte = db.Column(db.Float, nullable=True)  # Living area
    woon_eenheid = db.Column(db.String(10), nullable=True)  # m2 or hectare

    district = db.Column(db.String(50), nullable=False, index=True)
    beschrijving = db.Column(db.Text)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        index=True,
    )

    images = db.relationship(
        "PropertyImage",
        backref="property",
        cascade="all, delete-orphan",
        lazy=True,
        order_by=lambda: (
            db.desc(PropertyImage.is_primary),
            PropertyImage.sort_order.asc(),
            PropertyImage.id.asc(),
        ),
    )


# --------------------------------------------------
# PROPERTY IMAGE
# --------------------------------------------------


class PropertyImage(db.Model):
    __tablename__ = "property_images"

    id = db.Column(db.Integer, primary_key=True)

    property_id = db.Column(
        db.Integer,
        db.ForeignKey("property.id"),
        nullable=False,
        index=True,
    )

    image_path = db.Column(db.String(255), nullable=False)

    is_primary = db.Column(db.Boolean, default=False)

    sort_order = db.Column(db.Integer, default=0, index=True)
