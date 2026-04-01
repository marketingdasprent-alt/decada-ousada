import re
import os

ws_root = r"c:\Users\ThiagoSousa\OneDrive - DASPRENT\Documentos\Década Ousada"
data_file = os.path.join(ws_root, "tmp", "fuel_cards_data.txt")
sql_file = os.path.join(ws_root, "tmp", "update_fuel_cards.sql")

def parse_cards(card_str):
    if not card_str or card_str.lower() == 'n/a':
        return None, None, None
    
    parts = [p.strip() for p in card_str.split('/')]
    bp = []
    repsol = []
    edp = []
    
    for p in parts:
        lp = p.lower()
        if 'bp' in lp:
            bp.append(p)
        elif 'repsol' in lp:
            repsol.append(p)
        elif 'edp' in lp:
            edp.append(p)
    
    return '/'.join(bp) if bp else None, '/'.join(repsol) if repsol else None, '/'.join(edp) if edp else None

sql_template = "UPDATE public.motoristas_ativos SET cartao_bp = {bp}, cartao_repsol = {repsol}, cartao_edp = {edp} WHERE nome = {nome};"

def quote(val):
    if val is None or val == '':
        return 'NULL'
    # Escape single quotes
    val = val.replace("'", "''")
    return f"'{val}'"

try:
    with open(data_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    output_sql = []
    for line in lines:
        if not line.strip():
            continue
        fields = line.strip().split('\t')
        if len(fields) < 2:
            continue
        nome = fields[0].strip()
        card_str = fields[1].strip()
        
        bp, repsol, edp = parse_cards(card_str)
        
        sql = sql_template.format(
            nome=quote(nome),
            bp=quote(bp),
            repsol=quote(repsol),
            edp=quote(edp)
        )
        output_sql.append(sql)

    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_sql))

    print(f"Generated {len(output_sql)} SQL statements.")
except Exception as e:
    print(f"Error: {e}")
