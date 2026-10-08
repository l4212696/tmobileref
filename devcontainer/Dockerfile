FROM mcr.microsoft.comvscodedevcontainersjavascript-node16

# Install additional packages if needed
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive && apt-get -y install --no-install-recommends

# Set default working directory
WORKDIR app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port
EXPOSE 3000

# Command to run the application
CMD [npm, start]