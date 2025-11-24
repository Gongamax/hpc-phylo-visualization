import time
import os
import csv
import statistics
import py4cytoscape as p4c

# Configuration
OUTPUT_FILE = "cytoscape_benchmark_results.csv"
DATA_REL_PATH = "../../data"
NUM_RUNS = 7


def run_benchmark():
    # Ensure Cytoscape is running
    try:
        p4c.cytoscape_ping()
    except Exception as e:
        print(f"Error connecting to Cytoscape: {e}")
        print("Please ensure Cytoscape is running.")
        return

    # Setup paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.abspath(os.path.join(script_dir, DATA_REL_PATH))
    output_path = os.path.join(script_dir, OUTPUT_FILE)

    print(f"Scanning for datasets in: {data_dir}")

    # Find all edgelist files
    datasets = []
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if file.endswith("_edgelist.csv"):
                datasets.append(os.path.join(root, file))

    datasets.sort()
    print(f"Found {len(datasets)} datasets.")

    # Prepare output CSV
    with open(output_path, "w", newline="") as csvfile:
        fieldnames = [
            "dataset_name",
            "file_path",
            "median_load_time",
            "mean_load_time",
            "std_dev",
            "all_runs",
            "status",
            "error_message",
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for file_path in datasets:
            dataset_name = os.path.basename(file_path)
            print(f"\nProcessing: {dataset_name}")

            run_times = []
            error_msg = ""
            status = "Success"

            for i in range(NUM_RUNS):
                print(f"  -> Run {i + 1}/{NUM_RUNS}...", end="", flush=True)

                # Clean up previous session to ensure fresh state
                try:
                    p4c.delete_all_networks()
                except Exception:
                    pass

                try:
                    # --- Start Timing ---
                    start_time = time.time()

                    p4c.import_network_from_tabular_file(
                        file_path,
                        first_row_as_column_names=True,
                        column_type_list="s,t",
                    )

                    # --- Stop Timing ---
                    end_time = time.time()
                    load_time = end_time - start_time
                    run_times.append(load_time)
                    print(f" {load_time:.4f}s")

                except Exception as e:
                    error_msg = str(e).replace("\n", " ")
                    status = "Failed"
                    print(f" Failed: {error_msg}")
                    # If one run fails, we abort this dataset to avoid skewed stats
                    break

            result = {
                "dataset_name": dataset_name,
                "file_path": file_path,
                "median_load_time": 0,
                "mean_load_time": 0,
                "std_dev": 0,
                "all_runs": [],
                "status": status,
                "error_message": error_msg,
            }

            if status == "Success" and run_times:
                result["median_load_time"] = round(statistics.median(run_times), 4)
                result["mean_load_time"] = round(statistics.mean(run_times), 4)
                result["std_dev"] = (
                    round(statistics.stdev(run_times), 4) if len(run_times) > 1 else 0
                )
                result["all_runs"] = [round(t, 4) for t in run_times]
                print(f"  -> Median: {result['median_load_time']}s")

            # Write result immediately
            writer.writerow(result)
            csvfile.flush()

    print(f"\nBenchmark complete. Results saved to {output_path}")


if __name__ == "__main__":
    run_benchmark()
