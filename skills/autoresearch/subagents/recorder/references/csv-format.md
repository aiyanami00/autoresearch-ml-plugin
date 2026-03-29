# Global Results CSV Format

All experiments append their results to a global CSV file at `experiments/result.csv`. This provides a cumulative dashboard comparing all experiments.

## CSV Columns

| Column | Description | Example |
|--------|-------------|---------|
| `experiment_id` | Experiment directory name | `experiment01` |
| `timestamp` | Experiment start timestamp (ISO format) | `2024-03-29T10:30:00.000Z` |
| `method` | Short description of method/model (100 chars max) | `ResNet-18 with data augmentation` |
| `best_metric_value` | Best metric value achieved | `0.9456` |
| `metric_direction` | `"max"` if maximizing, `"min"` if minimizing | `max` |
| `status` | Experiment final status: `completed`, `failed`, `interrupted` | `completed` |
| `duration_minutes` | Total training duration in minutes | `45.5` |

## Example

```csv
experiment_id,timestamp,method,best_metric_value,metric_direction,status,duration_minutes
experiment01,2024-03-29T10:30:00.000Z,"Simple CNN baseline",0.8765,max,completed,12.5
experiment02,2024-03-29T11:00:00.000Z,"ResNet-18 with augmentation",0.9456,max,completed,28.3
```

## Notes

- If the file doesn't exist, create it with the header row first
- Quote the `method` field in case it contains commas
- This file is cumulative - every experiment adds one line
- Users can open this CSV in Excel/Google Sheets to compare all experiments
