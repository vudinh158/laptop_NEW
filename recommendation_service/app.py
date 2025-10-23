from flask import Flask, request, jsonify
from flask_cors import CORS
from core.recommend import recommend_core, health_info

app = Flask(__name__)
CORS(app)

@app.get("/health")
def health():
    return jsonify(health_info())

@app.get("/recommend/<int:variation_id>")
def recommend_path(variation_id: int):
    out, code = recommend_core(variation_id)
    if out is None:
        return jsonify({"error": "variation_id not found"}), code
    return jsonify(out), code

@app.get("/recommend")
def recommend_query():
    var_id = request.args.get("variation_id", type=int)
    if var_id is None:
        return jsonify({"error": "variation_id is required"}), 400
    out, code = recommend_core(var_id)
    if out is None:
        return jsonify({"error": "variation_id not found"}), code
    return jsonify(out), code

if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8000)), debug=True)
