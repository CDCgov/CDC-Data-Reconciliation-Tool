import csv
import random
import uuid

def read_csv_to_dict(file_path):
    data_dict = {}
    with open(file_path, 'r') as file:
        reader = csv.DictReader(file)
        i = 0
        for row in reader:
            data_dict[i] = row
            i += 1
    return data_dict

cdc_file_path = 'cdc.csv'
cdc_data_dict = read_csv_to_dict(cdc_file_path)

state_file_path = 'state.csv'
state_data_dict = read_csv_to_dict(state_file_path)

# Create two new files, cdc_bench.csv and state_bench.csv, each benchmark csv file should contain 1000000 rows of data
# The CaseID column should be randomly generated and unique while the other columns should be taken from random rows in the original files
def generate_benchmark_csv(file_path, data_dict, unique_ids):
    with open(file_path, 'w', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=data_dict[0].keys())
        writer.writeheader()
        for id in unique_ids:
            random_row = random.choice(list(data_dict.values()))
            random_row['CaseID'] = id
            writer.writerow(random_row)

benchmark_num_rows = 1000000
benchmark_ids = [str(uuid.uuid4()) for _ in range(benchmark_num_rows)]

cdc_bench_file_path = 'cdc_bench.csv'
generate_benchmark_csv(cdc_bench_file_path, cdc_data_dict, benchmark_ids)

state_bench_file_path = 'state_bench.csv'
generate_benchmark_csv(state_bench_file_path, state_data_dict, benchmark_ids)
