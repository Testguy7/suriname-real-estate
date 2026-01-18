import os
import uuid

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    session,
    abort,
    url_for,
    flash,
    jsonify,
)
from werkzeug.utils import secure_filename
from sqlalchemy import or_

from flask_migrate import Migrate
from models import db, User, Property, PropertyImage
from locations import DISTRICT_WIJKEN


# --------------------------------------------------
# APP CONFIG
# --------------------------------------------------

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
MAX_PHOTOS_PER_PROPERTY = 10

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///realestate.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

db.init_app(app)
migrate = Migrate(app, db)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_current_user_id():
    return session.get("user_id")


def apply_filters(query, args):
    if args.get("status"):
        query = query.filter(Property.status == args.get("status").lower())
    if args.get("type_object"):
        query = query.filter(Property.type_object == args.get("type_object").lower())
    if args.get("valuta"):
        query = query.filter(Property.valuta == args.get("valuta").upper())
    if args.get("min_prijs"):
        try:
            query = query.filter(Property.prijs >= float(args.get("min_prijs")))
        except ValueError:
            pass
    if args.get("max_prijs"):
        try:
            query = query.filter(Property.prijs <= float(args.get("max_prijs")))
        except ValueError:
            pass
    if args.get("q"):
        zoekterm = f"%{args.get('q').strip().lower()}%"
        query = query.filter(
            or_(
                Property.titel.ilike(zoekterm),
                Property.beschrijving.ilike(zoekterm),
            )
        )
    return query


# --------------------------------------------------
# JINJA FILTERS
# --------------------------------------------------


def format_price(value):
    try:
        return f"{int(value):,}".replace(",", ".")
    except (ValueError, TypeError):
        return value


def format_currency(value, currency="SRD"):
    """Format price with currency symbol"""
    try:
        formatted_value = f"{int(value):,}".replace(",", ".")

        currency_symbols = {"SRD": "SRD", "USD": "$", "EUR": "€"}

        symbol = currency_symbols.get(currency.upper(), currency)

        # EUR goes before, others after
        if currency.upper() == "EUR":
            return f"€ {formatted_value}"
        elif currency.upper() == "USD":
            return f"$ {formatted_value}"
        else:
            return f"{symbol} {formatted_value}"

    except (ValueError, TypeError):
        return value


app.jinja_env.filters["price"] = format_price
app.jinja_env.filters["currency"] = format_currency


# --------------------------------------------------
# API
# --------------------------------------------------


@app.route("/api/wijken/<district>")
def api_wijken(district):
    return jsonify(DISTRICT_WIJKEN.get(district.lower(), []))


# --------------------------------------------------
# HOME
# --------------------------------------------------


@app.route("/")
def home():
    query = Property.query

    district = request.args.get("district")
    wijk = request.args.get("wijk")

    if district:
        query = query.filter(Property.district.ilike(f"{district.lower()}%"))
    if wijk:
        query = query.filter(Property.district.ilike(f"%{wijk.lower()}"))

    query = apply_filters(query, request.args)

    page = request.args.get("page", 1, type=int)
    pagination = query.order_by(Property.id.desc()).paginate(
        page=page, per_page=12, error_out=False
    )

    wijken = DISTRICT_WIJKEN.get(district.lower(), []) if district else []

    return render_template(
        "index.html",
        properties=pagination.items,
        pagination=pagination,
        wijken=wijken,
        q=request.args.get("q", ""),
        district=district,
        wijk=wijk,
        status=request.args.get("status", ""),
        type_object=request.args.get("type_object", ""),
        valuta=request.args.get("valuta", ""),
        min_prijs=request.args.get("min_prijs"),
        max_prijs=request.args.get("max_prijs"),
    )


# --------------------------------------------------
# HUIZEN PAGE
# --------------------------------------------------


@app.route("/huizen")
def huizen():
    query = Property.query.filter_by(type_object="huis")

    district = request.args.get("district")
    wijk = request.args.get("wijk")

    if district:
        query = query.filter(Property.district.ilike(f"{district.lower()}%"))
    if wijk:
        query = query.filter(Property.district.ilike(f"%{wijk.lower()}"))

    query = apply_filters(query, request.args)

    page = request.args.get("page", 1, type=int)
    pagination = query.order_by(Property.id.desc()).paginate(
        page=page, per_page=12, error_out=False
    )

    wijken = DISTRICT_WIJKEN.get(district.lower(), []) if district else []

    return render_template(
        "huizen.html",
        properties=pagination.items,
        pagination=pagination,
        wijken=wijken,
        q=request.args.get("q", ""),
        district=district,
        wijk=wijk,
        status=request.args.get("status", ""),
        valuta=request.args.get("valuta", ""),
        min_prijs=request.args.get("min_prijs"),
        max_prijs=request.args.get("max_prijs"),
    )


# --------------------------------------------------
# PERCELEN PAGE
# --------------------------------------------------


@app.route("/percelen")
def percelen():
    query = Property.query.filter_by(type_object="perceel")

    district = request.args.get("district")
    wijk = request.args.get("wijk")

    if district:
        query = query.filter(Property.district.ilike(f"{district.lower()}%"))
    if wijk:
        query = query.filter(Property.district.ilike(f"%{wijk.lower()}"))

    query = apply_filters(query, request.args)

    page = request.args.get("page", 1, type=int)
    pagination = query.order_by(Property.id.desc()).paginate(
        page=page, per_page=12, error_out=False
    )

    wijken = DISTRICT_WIJKEN.get(district.lower(), []) if district else []

    return render_template(
        "percelen.html",
        properties=pagination.items,
        pagination=pagination,
        wijken=wijken,
        q=request.args.get("q", ""),
        district=district,
        wijk=wijk,
        status=request.args.get("status", ""),
        valuta=request.args.get("valuta", ""),
        min_prijs=request.args.get("min_prijs"),
        max_prijs=request.args.get("max_prijs"),
    )


# --------------------------------------------------
# AUTH
# --------------------------------------------------


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        if not email or not password:
            flash("E-mail en wachtwoord zijn verplicht.", "danger")
            return render_template("login.html")

        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            session["user_id"] = user.id
            flash("Succesvol ingelogd.", "success")
            return redirect(url_for("home"))
        flash("Ongeldige e-mail of wachtwoord.", "danger")
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("user_id", None)
    flash("Je bent uitgelogd.", "info")
    return redirect(url_for("home"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        naam = request.form.get("naam", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        password_confirm = request.form.get("password_confirm", "")

        # Validation
        if not all([naam, email, password, password_confirm]):
            flash("Alle velden zijn verplicht.", "danger")
            return redirect(url_for("register"))

        # Check password confirmation
        if password != password_confirm:
            flash("Wachtwoorden komen niet overeen.", "danger")
            return redirect(url_for("register"))

        if len(password) < 6:
            flash("Wachtwoord moet minimaal 6 karakters zijn.", "danger")
            return redirect(url_for("register"))

        if User.query.filter_by(email=email).first():
            flash("Dit e-mailadres bestaat al.", "danger")
            return redirect(url_for("register"))

        user = User(naam=naam, email=email)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        session["user_id"] = user.id
        flash("Account aangemaakt. Welkom!", "success")
        return redirect(url_for("home"))

    return render_template("register.html")


# --------------------------------------------------
# DASHBOARD
# --------------------------------------------------


@app.route("/dashboard")
def dashboard():
    user_id = get_current_user_id()
    if not user_id:
        flash("Log eerst in.", "warning")
        return redirect(url_for("login"))

    properties = (
        Property.query.filter_by(user_id=user_id).order_by(Property.id.desc()).all()
    )

    return render_template("dashboard.html", properties=properties)


# --------------------------------------------------
# ADD PROPERTY
# --------------------------------------------------


@app.route("/add_property", methods=["GET", "POST"])
def add_property():
    user_id = get_current_user_id()
    if not user_id:
        flash("Log eerst in.", "warning")
        return redirect(url_for("login"))

    if request.method == "POST":
        # Validation
        titel = request.form.get("titel", "").strip()
        type_object = request.form.get("type_object", "").lower()
        status = request.form.get("status", "").lower()
        prijs = request.form.get("prijs")
        district = request.form.get("district", "").strip()

        if not all([titel, type_object, status, prijs, district]):
            flash("Vul alle verplichte velden in.", "danger")
            return redirect(request.url)

        try:
            prijs = float(prijs)
            if prijs < 0:
                raise ValueError
        except ValueError:
            flash("Ongeldige prijs.", "danger")
            return redirect(request.url)

        wijk = request.form.get("wijk", "").strip()
        full_district = f"{district} - {wijk}" if wijk else district

        # Get optional fields
        grondrecht = request.form.get("grondrecht", "").strip() or None
        perceel_oppervlakte = request.form.get("perceel_oppervlakte")
        perceel_eenheid = request.form.get("perceel_eenheid", "").strip() or None
        woon_oppervlakte = request.form.get("woon_oppervlakte")
        woon_eenheid = request.form.get("woon_eenheid", "").strip() or None

        # Convert to float if provided
        try:
            perceel_oppervlakte = (
                float(perceel_oppervlakte) if perceel_oppervlakte else None
            )
        except (ValueError, TypeError):
            perceel_oppervlakte = None

        try:
            woon_oppervlakte = float(woon_oppervlakte) if woon_oppervlakte else None
        except (ValueError, TypeError):
            woon_oppervlakte = None

        listing = Property(
            titel=titel,
            type_object=type_object,
            status=status,
            prijs=prijs,
            valuta=request.form.get("valuta", "SRD").upper(),
            grondrecht=grondrecht,
            perceel_oppervlakte=perceel_oppervlakte,
            perceel_eenheid=perceel_eenheid,
            woon_oppervlakte=woon_oppervlakte,
            woon_eenheid=woon_eenheid,
            district=full_district.lower(),
            beschrijving=request.form.get("beschrijving", "").strip(),
            user_id=user_id,
        )

        db.session.add(listing)
        db.session.commit()

        # Photo upload
        photos = request.files.getlist("fotos")
        valid_photos = [
            p for p in photos if p and p.filename and allowed_file(p.filename)
        ]

        if len(valid_photos) > MAX_PHOTOS_PER_PROPERTY:
            flash(
                f"Je mag maximaal {MAX_PHOTOS_PER_PROPERTY} foto's uploaden.", "warning"
            )
            db.session.delete(listing)
            db.session.commit()
            return redirect(request.url)

        first = True
        for idx, photo in enumerate(valid_photos):
            try:
                ext = secure_filename(photo.filename).rsplit(".", 1)[1].lower()
                filename = f"{uuid.uuid4().hex}.{ext}"
                filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                photo.save(filepath)

                db.session.add(
                    PropertyImage(
                        property_id=listing.id,
                        image_path=f"uploads/{filename}",
                        is_primary=first,
                        sort_order=idx,
                    )
                )
                first = False
            except Exception as e:
                print(f"Error uploading photo: {e}")
                continue

        db.session.commit()
        flash("Advertentie succesvol geplaatst.", "success")
        return redirect(url_for("dashboard"))

    return render_template("add_property.html")


# --------------------------------------------------
# PROPERTY DETAIL
# --------------------------------------------------


@app.route("/property/<int:property_id>")
def property_detail(property_id):
    listing = db.session.get(Property, property_id)
    if not listing:
        abort(404)

    is_owner = get_current_user_id() == listing.user_id

    district_parts = listing.district.split(" - ")
    breadcrumb_district = district_parts[0].capitalize()
    breadcrumb_wijk = (
        district_parts[1].capitalize() if len(district_parts) > 1 else None
    )

    images = (
        PropertyImage.query.filter_by(property_id=listing.id)
        .order_by(PropertyImage.is_primary.desc(), PropertyImage.sort_order.asc())
        .all()
    )

    primary_image = next(
        (img for img in images if img.is_primary),
        images[0] if images else None,
    )

    return render_template(
        "property_detail.html",
        listing=listing,
        is_owner=is_owner,
        breadcrumb_district=breadcrumb_district,
        breadcrumb_wijk=breadcrumb_wijk,
        images=images,
        primary_image=primary_image,
    )


# --------------------------------------------------
# EDIT PROPERTY
# --------------------------------------------------


@app.route("/property/<int:property_id>/edit", methods=["GET", "POST"])
def edit_property(property_id):
    listing = db.session.get(Property, property_id)
    if not listing:
        abort(404)

    if listing.user_id != get_current_user_id():
        abort(403)

    if request.method == "POST":
        # Update fields with validation
        titel = request.form.get("titel", "").strip()
        prijs = request.form.get("prijs")

        if not titel:
            flash("Titel is verplicht.", "danger")
            return redirect(request.url)

        try:
            prijs = float(prijs)
            if prijs < 0:
                raise ValueError
        except ValueError:
            flash("Ongeldige prijs.", "danger")
            return redirect(request.url)

        listing.titel = titel
        listing.type_object = request.form.get(
            "type_object", listing.type_object
        ).lower()
        listing.status = request.form.get("status", listing.status).lower()
        listing.prijs = prijs
        listing.valuta = request.form.get("valuta", listing.valuta).upper()
        listing.beschrijving = request.form.get("beschrijving", "").strip()

        # Update optional fields
        listing.grondrecht = request.form.get("grondrecht", "").strip() or None

        perceel_opp = request.form.get("perceel_oppervlakte")
        try:
            listing.perceel_oppervlakte = float(perceel_opp) if perceel_opp else None
        except (ValueError, TypeError):
            listing.perceel_oppervlakte = None

        listing.perceel_eenheid = (
            request.form.get("perceel_eenheid", "").strip() or None
        )

        woon_opp = request.form.get("woon_oppervlakte")
        try:
            listing.woon_oppervlakte = float(woon_opp) if woon_opp else None
        except (ValueError, TypeError):
            listing.woon_oppervlakte = None

        listing.woon_eenheid = request.form.get("woon_eenheid", "").strip() or None

        # Photo upload
        photos = request.files.getlist("fotos")
        existing_count = PropertyImage.query.filter_by(property_id=listing.id).count()
        valid_photos = [
            p for p in photos if p and p.filename and allowed_file(p.filename)
        ]

        if existing_count + len(valid_photos) > MAX_PHOTOS_PER_PROPERTY:
            flash(
                f"Maximaal {MAX_PHOTOS_PER_PROPERTY} foto's toegestaan. Verwijder eerst een foto.",
                "warning",
            )
            return redirect(request.url)

        has_primary = PropertyImage.query.filter_by(
            property_id=listing.id, is_primary=True
        ).first()

        # Get max sort_order
        max_order = (
            db.session.query(db.func.max(PropertyImage.sort_order))
            .filter_by(property_id=listing.id)
            .scalar()
            or 0
        )

        for idx, photo in enumerate(valid_photos):
            try:
                ext = secure_filename(photo.filename).rsplit(".", 1)[1].lower()
                filename = f"{uuid.uuid4().hex}.{ext}"
                filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                photo.save(filepath)

                db.session.add(
                    PropertyImage(
                        property_id=listing.id,
                        image_path=f"uploads/{filename}",
                        is_primary=False if has_primary else True,
                        sort_order=max_order + idx + 1,
                    )
                )
                has_primary = True
            except Exception as e:
                print(f"Error uploading photo: {e}")
                continue

        db.session.commit()
        flash("Advertentie bijgewerkt.", "success")
        return redirect(url_for("property_detail", property_id=listing.id))

    return render_template("edit_property.html", property=listing)


# --------------------------------------------------
# DELETE PROPERTY
# --------------------------------------------------


@app.route("/property/<int:property_id>/delete", methods=["POST"])
def delete_property(property_id):
    listing = db.session.get(Property, property_id)
    if not listing:
        abort(404)

    if listing.user_id != get_current_user_id():
        abort(403)

    # Delete all associated images from filesystem
    for image in listing.images:
        path = os.path.join(app.static_folder, image.image_path)
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                print(f"Error deleting file {path}: {e}")

    db.session.delete(listing)
    db.session.commit()

    flash("Advertentie verwijderd.", "info")
    return redirect(url_for("dashboard"))


# --------------------------------------------------
# DELETE IMAGE
# --------------------------------------------------


@app.route("/property/image/<int:image_id>/delete", methods=["POST"])
def delete_property_image(image_id):
    image = db.session.get(PropertyImage, image_id)
    if not image:
        return jsonify({"success": False, "error": "Image not found"}), 404

    # Check ownership
    if image.property.user_id != get_current_user_id():
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    property_id = image.property_id
    was_primary = image.is_primary

    # Delete file
    path = os.path.join(app.static_folder, image.image_path)
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception as e:
            print(f"Error deleting file: {e}")

    db.session.delete(image)
    db.session.commit()

    new_primary_id = None

    # Set new primary if needed
    if was_primary:
        next_image = (
            PropertyImage.query.filter_by(property_id=property_id)
            .order_by(PropertyImage.sort_order.asc())
            .first()
        )
        if next_image:
            next_image.is_primary = True
            db.session.commit()
            new_primary_id = next_image.id

    return jsonify({"success": True, "new_primary_id": new_primary_id})


# --------------------------------------------------
# SET PRIMARY IMAGE
# --------------------------------------------------


@app.route("/property/image/<int:image_id>/set-primary", methods=["POST"])
def set_primary_image(image_id):
    image = db.session.get(PropertyImage, image_id)
    if not image:
        return jsonify({"success": False}), 404

    if image.property.user_id != get_current_user_id():
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    # Remove primary from all images of this property
    PropertyImage.query.filter_by(property_id=image.property_id).update(
        {"is_primary": False}
    )

    image.is_primary = True
    db.session.commit()

    return jsonify({"success": True, "image_id": image.id})


# --------------------------------------------------
# REORDER IMAGES
# --------------------------------------------------


@app.route("/property/image/reorder", methods=["POST"])
def reorder_images():
    data = request.get_json()
    if not data or "order" not in data:
        return jsonify({"success": False, "error": "Invalid data"}), 400

    order = data.get("order", [])

    try:
        for item in order:
            img = db.session.get(PropertyImage, int(item["id"]))
            if img and img.property.user_id == get_current_user_id():
                img.sort_order = item["sort_order"]

        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# --------------------------------------------------
# TOGGLE STATUS
# --------------------------------------------------


@app.route("/property/<int:property_id>/toggle_status", methods=["POST"])
def toggle_status(property_id):
    listing = db.session.get(Property, property_id)
    if not listing:
        abort(404)

    if listing.user_id != get_current_user_id():
        abort(403)

    status_map = {
        "te koop": "verkocht",
        "verkocht": "te koop",
        "te huur": "verhuurd",
        "verhuurd": "te huur",
    }

    listing.status = status_map.get(listing.status, listing.status)
    db.session.commit()

    flash("Status aangepast.", "success")
    return redirect(url_for("dashboard"))


# --------------------------------------------------
# ERROR HANDLERS
# --------------------------------------------------


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404


@app.errorhandler(403)
def forbidden(e):
    flash("Je hebt geen toegang tot deze pagina.", "danger")
    return redirect(url_for("home"))


@app.errorhandler(413)
def request_entity_too_large(e):
    flash("Bestanden zijn te groot. Maximaal 16MB toegestaan.", "danger")
    return redirect(request.referrer or url_for("home"))


# --------------------------------------------------
# RUN
# --------------------------------------------------

if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Create tables if they don't exist
    app.run(debug=True)
