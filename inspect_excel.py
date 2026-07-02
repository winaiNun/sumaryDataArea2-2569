from pathlib import Path
import pandas as pd
p = Path('001.xlsx')
print('exists', p.exists())
xl = pd.ExcelFile(p)
print('sheets:', xl.sheet_names)
for sheet in xl.sheet_names:
    df = xl.parse(sheet)
    print('\n--- SHEET:', sheet)
    print('shape', df.shape)
    print('first_cols', df.columns[:20].tolist())
    status_cols = [c for c in df.columns if 'สถานะ' in str(c)]
    print('status_count', len(status_cols))
    print('first_status_cols', status_cols[:12])
    print('sample_rows:', df.iloc[:2, :15].to_dict(orient='records'))
