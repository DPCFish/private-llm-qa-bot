function usage {
  echo "Make sure Python installed properly. Usage: $0 -t TOKEN [-m MODEL_NAME] [-c COMMIT_HASH]"
  echo "  -t TOKEN            Hugging Face token (required)"
  echo "  -m MODEL_NAME       Model name (default: csdc-atl/buffer-cross-001)"
  echo "  -c COMMIT_HASH      Commit hash (default: 46d270928463db49b317e5ea469a8ac8152f4a13)"
  echo "  -s S3_BUCKET_NAME   S3 bucket name to upload the model (default: llm-rag)"
  exit 1
}

# Default values
model_name="Qwen/Qwen-14B-Chat-Int4"
commit_hash="0f5e18f5f18b3ced68be965099f091189964ed85"
s3_bucket_name="llm-rag" # Default S3 bucket name

# Parse command-line options
while getopts ":t:m:c:s:" opt; do
  case $opt in
    t) hf_token="$OPTARG" ;;
    m) model_name="$OPTARG" ;;
    c) commit_hash="$OPTARG" ;;
    s) s3_bucket_name="$OPTARG" ;;
    \?) echo "Invalid option: -$OPTARG" >&2; usage ;;
    :) echo "Option -$OPTARG requires an argument." >&2; usage ;;
  esac
done

# Validate the hf_token and python interpreter exist
if [ -z "$hf_token" ] || ! command -v python &> /dev/null; then
  usage
fi

# Install necessary packages
pip install huggingface-hub -Uqq
pip install -U sagemaker

# Define local model path
local_model_path="."

# Uncomment the line below if you want to create a specific directory for the model
# mkdir -p $local_model_path

# Download model snapshot in current folder without model prefix added
python -c "from huggingface_hub import snapshot_download; from pathlib import Path; snapshot_download(repo_id='$model_name', revision='$commit_hash', cache_dir=Path('.'), token='$hf_token')"

# Find model snapshot path with the first search result
model_snapshot_path=$(find . -path '*/snapshots/*' -type d -print -quit)
echo "Model snapshot path: $model_snapshot_path"