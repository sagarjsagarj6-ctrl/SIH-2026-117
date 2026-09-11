"""Optional local LoRA trainer.

This script is intentionally dependency-gated. Install torch, transformers,
and peft in the air-gapped training environment, set TRAINING_MODEL_PATH, and
the Node API can execute this script without ever using a shell command.
"""

import argparse
import json
import os
from typing import Dict, List


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--model', required=True)
    parser.add_argument('--epochs', type=int, default=3)
    parser.add_argument('--batch-size', type=int, default=4)
    parser.add_argument('--learning-rate', default='2e-4')
    parser.add_argument('--lora-r', type=int, default=16)
    parser.add_argument('--lora-alpha', type=int, default=32)
    parser.add_argument('--warmup-steps', type=int, default=0)
    return parser.parse_args()


def load_rows(path: str) -> List[Dict[str, str]]:
    rows = []
    with open(path, 'r', encoding='utf-8') as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def main():
    args = parse_args()
    import torch
    from datasets import Dataset
    from peft import LoraConfig, TaskType, get_peft_model
    from transformers import AutoModelForCausalLM, AutoTokenizer, DataCollatorForLanguageModeling, Trainer, TrainingArguments, TrainerCallback

    rows = load_rows(args.dataset)
    if not rows:
        raise RuntimeError('Training dataset is empty.')

    tokenizer = AutoTokenizer.from_pretrained(args.model, local_files_only=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(args.model, local_files_only=True)
    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        target_modules=['q_proj', 'v_proj'],
        task_type=TaskType.CAUSAL_LM,
    )
    model = get_peft_model(model, lora_config)

    dataset = Dataset.from_list([
        {'text': f"### Instruction\n{row.get('instruction', '')}\n### Input\n{row.get('input', '')}\n### Response\n{row.get('output', '')}"}
        for row in rows
    ])

    def tokenize(batch):
        return tokenizer(batch['text'], truncation=True, max_length=1024)

    tokenized = dataset.map(tokenize, batched=True, remove_columns=['text'])

    class ProgressCallback(TrainerCallback):
        def on_log(self, args, state, control, logs=None, **kwargs):
            logs = logs or {}
            payload = {
                'step': state.global_step,
                'totalSteps': state.max_steps,
                'progressPercent': round((state.global_step / max(state.max_steps, 1)) * 100, 2),
                'loss': logs.get('loss'),
            }
            print(f"SOVEREIGN_TRAIN_PROGRESS {json.dumps(payload)}", flush=True)

    training_args = TrainingArguments(
        output_dir=args.output,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=float(args.learning_rate),
        warmup_steps=args.warmup_steps,
        logging_steps=1,
        save_strategy='epoch',
        report_to=[],
        remove_unused_columns=False,
        fp16=torch.cuda.is_available(),
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
        callbacks=[ProgressCallback()],
    )
    trainer.train()
    model.save_pretrained(args.output)
    tokenizer.save_pretrained(args.output)
    print('SOVEREIGN_TRAIN_COMPLETE ' + json.dumps({'output': args.output, 'samples': len(rows)}), flush=True)


if __name__ == '__main__':
    main()

