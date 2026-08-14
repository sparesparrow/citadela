# -*- coding: utf-8 -*-
import json, numpy as np, onnxruntime as ort
from tokenizers import Tokenizer
M='/tmp/qwen'
cfg=json.load(open(f'{M}/config.json')); tok=Tokenizer.from_file(f'{M}/tokenizer.json')
NL,NKV,HD=cfg['num_hidden_layers'],cfg['num_key_value_heads'],64
so=ort.SessionOptions(); so.log_severity_level=3; so.intra_op_num_threads=2
sess=ort.InferenceSession(f'{M}/onnx/model_int8.onnx',so,providers=['CPUExecutionProvider'])
ON=[o.name for o in sess.get_outputs()]

def logits_full(ids):
    """Bez KV cache: cely kontext projde odznova. Zadna nejistota z cache."""
    feed={'input_ids':np.array([ids],np.int64),
          'attention_mask':np.ones((1,len(ids)),np.int64),
          'position_ids':np.arange(len(ids),dtype=np.int64)[None,:]}
    for l in range(NL):
        for kv in ('key','value'):
            feed[f'past_key_values.{l}.{kv}']=np.zeros((1,NKV,0,HD),np.float32)
    return sess.run(None,feed)[ON.index('logits')][0,-1,:].astype(np.float64)

def softmax(x):
    e=np.exp(x-x.max()); return e/e.sum()

def show(tag,prompt,nsteps=2,k=8):
    print('='*74); print(tag); print(f'vstup: {prompt!r}')
    ids=list(tok.encode(prompt,add_special_tokens=False).ids)
    print(f'tokenů ve vstupu: {len(ids)}    velikost slovníku: {cfg["vocab_size"]}\n')
    for t in range(1,nsteps+1):
        p=softmax(logits_full(ids))
        H=float(-(p*np.log2(np.clip(p,1e-30,None))).sum())
        idx=np.argsort(-p)[:k]
        print(f'--- KROK {t} ---   Σp={p.sum():.8f}   entropie={H:.3f} b   perplexita={2**H:.1f}')
        for r,i in enumerate(idx,1):
            s=tok.decode([int(i)]) or tok.id_to_token(int(i))
            print(f'  {r}. id={int(i):<7}{s!r:<14} p={p[i]:.6f}  {p[i]*100:6.2f}%  {"█"*int(round(p[i]*40))}')
        print(f'  zbylých {cfg["vocab_size"]-k} tokenů dohromady: {(1-p[idx].sum())*100:.2f}%')
        top=int(np.argmax(p)); print(f'  → greedy: {tok.decode([top])!r}\n')
        ids.append(top)

CH=lambda u:f"<|im_start|>system\nJsi asistent. Odpovídej česky.<|im_end|>\n<|im_start|>user\n{u}<|im_end|>\n<|im_start|>assistant\n"
show('A) ŠPIČATÉ ROZDĚLENÍ — dokončení slova uprostřed','Hlavní město České republiky je Pra')
show('B) CHAT — faktická otázka',CH('Kolik je dva plus dva? Odpověz jedním číslem.'))
show('C) PLOCHÉ ROZDĚLENÍ — tvůj vlastní fragment',CH('Váha je slovo hw příbuzné hmotnosti. Principu je mít rozdíl váhy.'))
